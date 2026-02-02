import { IsOptional, IsString, IsObject, IsNotEmpty } from 'class-validator';

export class CreateWidgetSessionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  groupId?: string;

  @IsString()
  @IsNotEmpty()
  initialMessage: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsObject()
  @IsOptional()
  browsingHistory?: {
    visits: Array<{
      path: string;
      title: string;
      enteredAt: number;
      durationMs?: number;
    }>;
    initialReferrer: string;
    source: 'direct' | 'referral' | 'unknown';
  };

  @IsObject()
  @IsOptional()
  environment?: {
    os: { name: string; version?: string | null };
    browser: { name: string; version?: string | null };
    device?: { type: string };
  };
}
