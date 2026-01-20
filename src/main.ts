import { NestFactory } from '@nestjs/core';
import { config } from 'dotenv';
config();
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import * as qs from 'qs';

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      // Configure Express to use qs for parsing query strings with bracket notation
      rawBody: true,
    });

    // Configure Express to parse array bracket notation in query strings
    app.set('query parser', (str: string) =>
      qs.parse(str, {
        arrayLimit: 100,
        parseArrays: true,
        allowDots: false,
        decoder: (value: string) => {
          // Decode URI component and handle arrays
          return decodeURIComponent(value);
        },
      })
    );

    // Serve static files for uploaded documents
    const uploadsPath = join(process.cwd(), 'uploads');
    console.log('📁 Static files path:', uploadsPath);

    app.useStaticAssets(uploadsPath, {
      prefix: '/uploads/',
    });

    // Enable global validation
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        transformOptions: {
          enableImplicitConversion: true, // Allow implicit type conversion
        },
        whitelist: true,
        forbidNonWhitelisted: false, // Allow extra properties to be stripped instead of throwing error
        skipMissingProperties: false,
        validateCustomDecorators: true,
      }),
    );

    // Enable global exception filter for detailed error handling
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Enable CORS with comprehensive configuration
    app.enableCors({
      origin: true, // Reflect the request origin (allows all origins with credentials)
      credentials: true, // Allow credentials (cookies, authorization headers)
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
        'Cache-Control',
        'Pragma',
      ],
      exposedHeaders: ['Content-Length', 'X-Requested-With'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
      maxAge: 86400, // Cache preflight response for 24 hours
    });

    const port = process.env.PORT ?? 3000;
    const host = '0.0.0.0'; // Bind to all interfaces for Cloud Run
    await app.listen(port, host);
    console.log(`🚀 Application is running on ${host}:${port}`);
  } catch (error) {
    console.error('❌ Error starting the application:', error);
    process.exit(1);
  }
}

void bootstrap();
