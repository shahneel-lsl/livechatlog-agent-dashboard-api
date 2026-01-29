import { Controller, Delete, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../database/mysql/conversation.entity';

@Controller('admin')
export class AdminController {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
  ) {}

  @Get('conversations/count')
  async getConversationsCount() {
    const count = await this.conversationRepository.count();
    return {
      success: true,
      count,
      message: `Total conversations: ${count}`,
    };
  }

  @Delete('conversations/clear-all')
  @HttpCode(HttpStatus.OK)
  async clearAllConversations() {
    try {
      // Get count before deletion
      const beforeCount = await this.conversationRepository.count();

      // Delete all conversations
      await this.conversationRepository.query('DELETE FROM conversations');
      
      // Reset auto-increment
      await this.conversationRepository.query(
        'ALTER TABLE conversations AUTO_INCREMENT = 1',
      );

      // Verify deletion
      const afterCount = await this.conversationRepository.count();

      return {
        success: true,
        deletedCount: beforeCount,
        remainingCount: afterCount,
        message: `Successfully deleted ${beforeCount} conversations`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to delete conversations',
      };
    }
  }
}
