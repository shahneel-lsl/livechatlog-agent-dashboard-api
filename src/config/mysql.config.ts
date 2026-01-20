import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const mysqlConfig = (): TypeOrmModuleOptions => {
  // Use socket path for Cloud SQL if provided, otherwise use host/port
  const dbConfig: any = {
    type: 'mysql' as const,
    username: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'livechatlog_database',
    entities: [__dirname + '/../database/mysql/*.entity{.ts,.js}'],
    synchronize: true, // Auto-sync schema with entities (no migrations needed)
    dropSchema: false, // Keep existing data
    logging: false, // Disable SQL query logging for cleaner output
    extra: {
      connectionLimit: 10,
      acquireTimeout: 60000,
      timeout: 60000,
    },
  };

  if (process.env.MYSQL_SOCKET_PATH) {
    dbConfig.socketPath = process.env.MYSQL_SOCKET_PATH;
  } else {
    dbConfig.host = process.env.MYSQL_HOST || 'localhost';
    dbConfig.port = parseInt(process.env.MYSQL_PORT || '3306', 10);
  }

  return dbConfig as TypeOrmModuleOptions;
};
