import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth(): Promise<{ status: string; timestamp: string; checks: any }> {
    const checks: any = {
      app: 'ok',
      database: 'unknown',
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    };

    // Check database connection with timeout
    try {
      await Promise.race([
        this.dataSource.query('SELECT 1'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database check timeout')), 5000)
        ),
      ]);
      checks.database = 'connected';
    } catch (error: any) {
      checks.database = 'error';
      checks.databaseError = error.message;
    }

    return {
      status: checks.database === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
