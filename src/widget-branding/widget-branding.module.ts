import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WidgetBrandingController } from './widget-branding.controller';
import { WidgetBrandingService } from './widget-branding.service';
import { WidgetMediaController } from './widget-media.controller';
import { WidgetMediaService } from './widget-media.service';
import { WidgetBranding } from '../database/mysql/widget-branding.entity';
import { Group } from '../database/mysql/group.entity';
import { AuthModule } from '../auth/auth.module';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WidgetBranding, Group]),
    AuthModule,
    FirebaseModule,
  ],
  controllers: [WidgetBrandingController, WidgetMediaController],
  providers: [WidgetBrandingService, WidgetMediaService],
  exports: [WidgetBrandingService, WidgetMediaService],
})
export class WidgetBrandingModule {}
