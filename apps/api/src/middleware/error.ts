import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        data: null,
        error: err.message,
        errorCode: err.errorCode,
      },
      err.statusCode as ContentfulStatusCode,
    );
  }

  // Log only message and stack — never the full error object (may contain sensitive data)
  console.error('Unhandled error:', err.message, err.stack);

  return c.json(
    {
      success: false,
      data: null,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    },
    500,
  );
};
