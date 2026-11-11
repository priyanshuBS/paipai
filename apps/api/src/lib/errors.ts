import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** An error that maps directly to a structured JSON error response. */
export class AppError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found`);
export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'BAD_REQUEST', message, details);
export const forbidden = (message = 'You do not have access to this resource') =>
  new AppError(403, 'FORBIDDEN', message);
export const unauthorized = () => new AppError(401, 'UNAUTHORIZED', 'Please log in to continue');
