import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const mysqlConfig = (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Use socket path for Cloud SQL if provided, otherwise use host/port
  const dbConfig: any = {
    type: 'mysql' as const,
    username: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'livechatlog_database',
    entities: [__dirname + '/../database/mysql/*.entity{.ts,.js}'],
    synchronize: false, // Disabled to prevent startup delays
    dropSchema: false, // Keep existing data
    logging: process.env.DB_LOGGING === 'true' ? ['error', 'warn'] : false,
    connectTimeout: 10000, // 10 seconds connection timeout (reduced from 30)
    acquireTimeout: 10000, // 10 seconds acquire timeout (reduced from 30)
    timeout: 10000, // Query timeout
    maxQueryExecutionTime: 10000, // Log slow queries over 10s
    extra: {
      connectionLimit: isProduction ? 10 : 5, // Reduced connection pool size
      waitForConnections: true,
      queueLimit: 50, // Limit queue to prevent memory issues (changed from 0)
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      connectTimeout: 10000, // MySQL driver level timeout
      // Add statement timeout to prevent hanging queries
      typeCast: true,
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
