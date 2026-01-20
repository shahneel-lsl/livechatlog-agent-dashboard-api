import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: HttpStatus;
    let errorResponse: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorData = exception.getResponse();

      // If the error response is already formatted, use it
      if (typeof errorData === 'object' && errorData['statusCode']) {
        errorResponse = errorData;
      } else {
        // Format simple HttpExceptions
        errorResponse = {
          statusCode: status,
          message: exception.message,
          error: HttpStatus[status],
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
        };
      }
    } else {
      // Handle unexpected errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage = exception instanceof Error ? exception.message : 'Internal server error';

      errorResponse = {
        statusCode: status,
        message: errorMessage,
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      };
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url}`,
      JSON.stringify({
        error: errorResponse,
        stack: exception instanceof Error ? exception.stack : undefined,
        body: request.body,
        query: request.query,
        params: request.params,
      }),
    );

    // Send the response
    response.status(status).json(errorResponse);
  }
}
