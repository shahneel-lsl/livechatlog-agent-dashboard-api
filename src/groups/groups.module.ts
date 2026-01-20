import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { GroupDocumentController } from './group-document.controller';
import { GroupDocumentService } from './group-document.service';
import { Group } from '../database/mysql/group.entity';
import { GroupDocument } from '../database/mysql/group-document.entity';
import { Agent } from '../database/mysql/agent.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupDocument, Agent]),
    AuthModule,
  ],
  controllers: [GroupsController, GroupDocumentController],
  providers: [GroupsService, GroupDocumentService],
  exports: [GroupsService, GroupDocumentService],
})
export class GroupsModule {}
