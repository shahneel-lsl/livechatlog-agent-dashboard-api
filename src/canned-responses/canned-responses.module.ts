import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CannedResponsesController } from './canned-responses.controller';
import { CannedResponsesService } from './canned-responses.service';
import { CannedResponse } from '../database/mysql/canned-response.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([CannedResponse]), AuthModule],
  controllers: [CannedResponsesController],
  providers: [CannedResponsesService],
  exports: [CannedResponsesService],
})
export class CannedResponsesModule {}
