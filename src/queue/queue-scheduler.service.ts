import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Conversation, ConversationStatus } from '../database/mysql/conversation.entity';
import { AgentAssignmentService } from '../chat/services/agent-assignment.service';
import { FirebaseService } from '../firebase/firebase.service';

interface QueueStats {
  pending: number;
  avgWaitTime: number;
  longestWait: number;
  atRiskCount: number;
  totalAssigned: number;
  failedAssignments: number;
}

@Injectable()
export class QueueSchedulerService {
  private readonly logger = new Logger(QueueSchedulerService.name);
  private assignmentStats = {
    totalAssigned: 0,
    failedAssignments: 0,
  };
  private readonly SLA_WARNING_THRESHOLD = 20; // seconds
  private readonly SLA_MAX_WAIT = 30; // seconds

  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    private agentAssignmentService: AgentAssignmentService,
    private firebaseService: FirebaseService,
  ) {}

  /**
   * Main queue processor - runs every 5 seconds
   * Processes all pending conversations and attempts assignment
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async processQueue(): Promise<void> {
    try {
      // Get all pending conversations
      const pendingConversations = await this.conversationRepository.find({
        where: { status: ConversationStatus.PENDING },
        relations: ['visitor', 'group'],
        order: { createdAt: 'ASC' }, // FIFO - oldest first
      });

      if (pendingConversations.length === 0) {
        // Update Firebase with empty queue
        await this.updateQueueStatsInFirebase({
          pending: 0,
          avgWaitTime: 0,
          longestWait: 0,
          atRiskCount: 0,
          totalAssigned: this.assignmentStats.totalAssigned,
          failedAssignments: this.assignmentStats.failedAssignments,
        });
        return;
      }

      this.logger.log(`📋 Processing queue: ${pendingConversations.length} pending conversations`);

      // Process each pending conversation
      for (const conversation of pendingConversations) {
        const waitTime = this.calculateWaitTime(conversation.createdAt);
        
        try {
          // Attempt to assign agent
          const result = await this.agentAssignmentService.assignAgentToConversation(
            conversation.id,
            conversation.groupId,
          );

          if (result.success) {
            this.assignmentStats.totalAssigned++;
            this.logger.log(
              `✅ Assigned agent ${result.assignedAgent?.name} to conversation ${conversation.id} (waited ${waitTime}s)`,
            );
          } else {
            // No agent available - stays in queue
            this.logger.debug(
              `⏳ No agent available for conversation ${conversation.id} (waiting ${waitTime}s) - will retry in 5s`,
            );

            // Update Firebase with wait time for supervisor visibility
            await this.updateConversationQueueStatus(conversation.id, waitTime);
          }
        } catch (error) {
          this.assignmentStats.failedAssignments++;
          this.logger.error(
            `❌ Error assigning conversation ${conversation.id}:`,
            error.message,
          );
        }
      }

      // Calculate and sync queue statistics
      await this.calculateAndSyncQueueStats(pendingConversations);
    } catch (error) {
      this.logger.error('Error processing queue:', error);
    }
  }

  /**
   * Calculate queue statistics
   */
  private async calculateAndSyncQueueStats(
    pendingConversations: Conversation[],
  ): Promise<void> {
    const now = new Date();
    const waitTimes = pendingConversations.map((conv) =>
      Math.floor((now.getTime() - new Date(conv.createdAt).getTime()) / 1000),
    );

    const stats: QueueStats = {
      pending: pendingConversations.length,
      avgWaitTime: waitTimes.length > 0
        ? Math.floor(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
        : 0,
      longestWait: waitTimes.length > 0 ? Math.max(...waitTimes) : 0,
      atRiskCount: waitTimes.filter((t) => t >= this.SLA_WARNING_THRESHOLD).length,
      totalAssigned: this.assignmentStats.totalAssigned,
      failedAssignments: this.assignmentStats.failedAssignments,
    };

    // Log if there are at-risk conversations
    if (stats.atRiskCount > 0) {
      this.logger.warn(
        `🚨 ${stats.atRiskCount} conversations at risk (waiting > ${this.SLA_WARNING_THRESHOLD}s)`,
      );
    }

    // Sync to Firebase for real-time supervisor dashboard
    await this.updateQueueStatsInFirebase(stats);
  }

  /**
   * Update queue stats in Firebase
   */
  private async updateQueueStatsInFirebase(stats: QueueStats): Promise<void> {
    try {
      const database = this.firebaseService.getDatabase();
      await database.ref('queue/stats').set({
        ...stats,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to update queue stats in Firebase:', error);
    }
  }

  /**
   * Update individual conversation queue status
   */
  private async updateConversationQueueStatus(
    conversationId: string,
    waitTime: number,
  ): Promise<void> {
    try {
      const slaStatus = waitTime >= this.SLA_MAX_WAIT
        ? 'breached'
        : waitTime >= this.SLA_WARNING_THRESHOLD
        ? 'at-risk'
        : 'ok';

      const database = this.firebaseService.getDatabase();
      await database.ref(`queue/conversations/${conversationId}`).set({
        waitTime,
        slaStatus,
        slaTimeRemaining: Math.max(0, this.SLA_MAX_WAIT - waitTime),
        lastChecked: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to update conversation queue status:', error);
    }
  }

  /**
   * Calculate wait time in seconds
   */
  private calculateWaitTime(createdAt: Date): number {
    const now = new Date();
    return Math.floor((now.getTime() - new Date(createdAt).getTime()) / 1000);
  }

  /**
   * Get queue statistics (for API endpoint)
   */
  async getQueueStats(): Promise<QueueStats> {
    const pendingConversations = await this.conversationRepository.find({
      where: { status: ConversationStatus.PENDING },
    });

    const now = new Date();
    const waitTimes = pendingConversations.map((conv) =>
      Math.floor((now.getTime() - new Date(conv.createdAt).getTime()) / 1000),
    );

    return {
      pending: pendingConversations.length,
      avgWaitTime: waitTimes.length > 0
        ? Math.floor(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
        : 0,
      longestWait: waitTimes.length > 0 ? Math.max(...waitTimes) : 0,
      atRiskCount: waitTimes.filter((t) => t >= this.SLA_WARNING_THRESHOLD).length,
      totalAssigned: this.assignmentStats.totalAssigned,
      failedAssignments: this.assignmentStats.failedAssignments,
    };
  }

  /**
   * Get pending conversations with wait times (for API endpoint)
   */
  async getPendingConversations(): Promise<any[]> {
    const pendingConversations = await this.conversationRepository.find({
      where: { status: ConversationStatus.PENDING },
      relations: ['visitor', 'group'],
      order: { createdAt: 'ASC' },
    });

    const now = new Date();
    return pendingConversations.map((conv) => {
      const waitTime = Math.floor(
        (now.getTime() - new Date(conv.createdAt).getTime()) / 1000,
      );
      const slaTimeRemaining = Math.max(0, this.SLA_MAX_WAIT - waitTime);
      const slaStatus = waitTime >= this.SLA_MAX_WAIT
        ? 'breached'
        : waitTime >= this.SLA_WARNING_THRESHOLD
        ? 'at-risk'
        : 'ok';

      return {
        id: conv.id,
        visitorName: conv.visitor?.name || 'Unknown',
        visitorEmail: conv.visitor?.email,
        groupId: conv.groupId,
        groupName: conv.group?.name,
        waitTime,
        slaTimeRemaining,
        slaStatus,
        createdAt: conv.createdAt,
      };
    });
  }
}
