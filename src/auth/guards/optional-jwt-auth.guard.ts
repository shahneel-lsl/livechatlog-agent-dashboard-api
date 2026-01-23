import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Override handleRequest to make JWT authentication optional
   * If token is invalid or missing, just return null instead of throwing
   */
  handleRequest(err: any, user: any) {
    // Return user if authenticated, null otherwise (no error thrown)
    return user || null;
  }

  /**
   * Always return true to allow the request through
   * User will be populated if valid token exists, null otherwise
   */
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
