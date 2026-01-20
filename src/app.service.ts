import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'LiveChatLog Dashboard API is running!';
  }
}
