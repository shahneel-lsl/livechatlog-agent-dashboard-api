/**
 * Example: How to integrate AgentAssignmentService with BullMQ
 * 
 * This file shows how to connect the assignment logic to BullMQ/Redis
 * when you're ready to enable queue-based assignment.
 * 
 * Current Implementation: setTimeout (3 seconds) in ChatService
 * Future Implementation: BullMQ job processing
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { AgentAssignmentService } from '../chat/services/agent-assignment.service';

@Injectable()
export class AssignmentQueueService implements OnModuleInit {
  private assignmentQueue: Queue;
  private assignmentWorker: Worker;
  private connection: Redis;

  constructor(
    private agentAssignmentService: AgentAssignmentService,
  ) {
    this.connection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
    });

    this.assignmentQueue = new Queue('agent-assignment', {
      connection: this.connection,
    });
  }

  onModuleInit() {
    this.startWorker();
  }

  /**
   * Start the BullMQ worker to process assignment jobs
   */
  private startWorker() {
    this.assignmentWorker = new Worker(
      'agent-assignment',
      async (job) => {
        const { conversationId, groupId } = job.data;

        console.log(`Processing assignment job for conversation ${conversationId}`);

        // Call the assignment service directly
        const result = await this.agentAssignmentService.assignAgentToConversation(
          conversationId,
          groupId,
        );

        if (!result.success) {
          // Throw error to trigger retry
          throw new Error(result.message);
        }

        return result;
      },
      {
        connection: this.connection,
        concurrency: 5, // Process up to 5 assignments simultaneously
      },
    );

    this.assignmentWorker.on('completed', (job, result) => {
      console.log(`✅ Assignment job ${job.id} completed:`, result.message);
    });

    this.assignmentWorker.on('failed', (job, err) => {
      console.error(`❌ Assignment job ${job?.id} failed:`, err.message);
    });
  }

  /**
   * Add assignment job to queue with delay
   * 
   * @param conversationId - ID of the conversation to assign
   * @param groupId - Optional group ID
   * @param delayMs - Delay in milliseconds (default: 3000)
   */
  async addAssignmentJob(
    conversationId: string,
    groupId?: string,
    delayMs: number = 3000,
  ): Promise<void> {
    await this.assignmentQueue.add(
      'assign-agent',
      {
        conversationId,
        groupId,
      },
      {
        delay: delayMs, // 3 seconds delay
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // 2s, 4s, 8s
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000,
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
    );

    console.log(`📋 Assignment job queued for conversation ${conversationId} (delay: ${delayMs}ms)`);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const waiting = await this.assignmentQueue.getWaitingCount();
    const active = await this.assignmentQueue.getActiveCount();
    const completed = await this.assignmentQueue.getCompletedCount();
    const failed = await this.assignmentQueue.getFailedCount();

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active,
    };
  }

  /**
   * Pause the queue
   */
  async pauseQueue(): Promise<void> {
    await this.assignmentQueue.pause();
    console.log('⏸️ Assignment queue paused');
  }

  /**
   * Resume the queue
   */
  async resumeQueue(): Promise<void> {
    await this.assignmentQueue.resume();
    console.log('▶️ Assignment queue resumed');
  }

  /**
   * Clean up old jobs
   */
  async cleanQueue(): Promise<void> {
    await this.assignmentQueue.clean(3600000, 100, 'completed'); // Remove completed jobs older than 1 hour
    await this.assignmentQueue.clean(86400000, 50, 'failed'); // Remove failed jobs older than 24 hours
    console.log('🧹 Queue cleaned');
  }

  /**
   * Gracefully close connections on shutdown
   */
  async onModuleDestroy() {
    await this.assignmentWorker?.close();
    await this.assignmentQueue?.close();
    await this.connection?.quit();
  }
}

/**
 * HOW TO INTEGRATE:
 * 
 * 1. Ensure Redis is running:
 *    redis-server
 * 
 * 2. Update queue.module.ts:
 */
/*
import { Module } from '@nestjs/common';
import { AssignmentQueueService } from './assignment-queue.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule],
  providers: [AssignmentQueueService],
  exports: [AssignmentQueueService],
})
export class QueueModule {}
*/

/**
 * 3. Update app.module.ts - Uncomment QueueModule:
 */
/*
@Module({
  imports: [
    // ... other imports
    QueueModule, // Uncomment this line
  ],
  // ...
})
export class AppModule {}
*/

/**
 * 4. Update chat.service.ts - Replace setTimeout with queue:
 */
/*
// OLD: Direct setTimeout
private scheduleAgentAssignment(conversationId: string, groupId?: string): void {
  setTimeout(async () => {
    const result = await this.agentAssignmentService.assignAgentToConversation(
      conversationId,
      groupId,
    );
  }, 3000);
}

// NEW: Using BullMQ
constructor(
  // ... other dependencies
  private assignmentQueueService: AssignmentQueueService, // Inject queue service
) {}

private async scheduleAgentAssignment(conversationId: string, groupId?: string): Promise<void> {
  // Add to queue with 3 second delay
  await this.assignmentQueueService.addAssignmentJob(conversationId, groupId, 3000);
}
*/

/**
 * 5. Benefits of BullMQ approach:
 * 
 * ✅ Persistent jobs (survives server restart)
 * ✅ Automatic retries with exponential backoff
 * ✅ Queue monitoring and statistics
 * ✅ Horizontal scaling (multiple workers)
 * ✅ Job prioritization
 * ✅ Pause/resume functionality
 * ✅ Failed job inspection and replay
 * ✅ Rate limiting
 * ✅ Scheduled jobs (cron-like)
 * 
 * 6. Monitoring:
 * 
 * - Install BullMQ Board for UI: npm install @bull-board/api @bull-board/express
 * - Or use Bull Dashboard: https://github.com/felixmosh/bull-board
 * - Check queue stats: await assignmentQueueService.getQueueStats()
 * 
 * 7. Testing without Redis:
 * 
 * Current implementation works fine without Redis using setTimeout.
 * When Redis is available, simply:
 * - Start Redis
 * - Uncomment QueueModule in app.module.ts
 * - Update chat.service.ts to use queue instead of setTimeout
 * 
 * That's it! The AgentAssignmentService.assignAgentToConversation() 
 * function remains the same - it's already prepared for queue integration.
 */
