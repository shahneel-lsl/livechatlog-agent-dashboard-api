import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MailerModule } from '@nestjs-modules/mailer';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { mysqlConfig } from './config/mysql.config';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { AgentsModule } from './agents/agents.module';
import { GroupsModule } from './groups/groups.module';
import { TagsModule } from './tags/tags.module';
import { ChatModule } from './chat/chat.module';
import { LogsModule } from './logs/logs.module';
import { CannedResponsesModule } from './canned-responses/canned-responses.module';
import { WidgetBrandingModule } from './widget-branding/widget-branding.module';
import { PrechatModule } from './prechat/prechat.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    // Rate limiting configuration
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 900000, // 15 minutes
        limit: 1000, // 1000 requests per 15 minutes
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: false,
    }),
    ScheduleModule.forRoot(),
    FirebaseModule,
    MailerModule.forRoot({
      transport: {
        host: 'smtp.elasticemail.com',
        port: 2525,
        secure: false,
        requireTLS: true,
        auth: {
          user: process.env.EMAIL_ID,
          pass: process.env.EMAIL_PASS,
        },
      },
      defaults: {
        from: process.env.EMAIL_FROM || '"LiveChatLog Dashboard" <noreply@livechatlog.com>',
      },
    }),
    TypeOrmModule.forRoot(mysqlConfig()),
    AuthModule,
    AgentsModule,
    GroupsModule,
    TagsModule,
    ChatModule,
    LogsModule,
    CannedResponsesModule,
    WidgetBrandingModule,
    PrechatModule,
    QueueModule, // Queue scheduler for automatic agent assignment
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
