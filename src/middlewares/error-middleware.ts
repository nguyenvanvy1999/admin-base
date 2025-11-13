import type { Elysia } from 'elysia';
import { AppError, ErrorCode } from '../constants/error';
import { logger } from '../libs/logger';

export function withErrorHandler(
  elysia: Elysia<any, any, any, any, any, any, any>,
) {
  return elysia.onError(({ error, code, set }) => {
    const errorType = error?.constructor?.name || 'Unknown';
    const isAppError = error instanceof AppError;
    const elysiaCode = code || 'UNKNOWN';
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(
      `Error handler called - Type: ${errorType}, IsAppError: ${isAppError}, Code: ${elysiaCode}, Message: ${errorMessage}`,
    );

    let errorCode: string;
    let status: number;
    let message: string;
    let errors: unknown;

    if (error instanceof AppError) {
      errorCode = error.code;
      message = error.message;
      status = 400;
    } else if (code === 'UNKNOWN') {
      errorCode = ErrorCode.VALIDATION_ERROR;
      message = error instanceof Error ? error.message : String(error);
      status = 400;
    } else if (code === 'INTERNAL_SERVER_ERROR' || code === 'PARSE') {
      logger.error(`Request error occurred ${JSON.stringify({ code, error })}`);
      errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
      message = error instanceof Error ? error.message : String(error);
      status = 500;
    } else if (code === 'VALIDATION') {
      errorCode = ErrorCode.VALIDATION_ERROR;
      message = error instanceof Error ? error.message : String(error);
      errors = (error as any).errors;
      status = 400;
    } else if (code === 'NOT_FOUND') {
      errorCode = ErrorCode.NOT_FOUND;
      message = error instanceof Error ? error.message : String(error);
      status = 404;
    } else {
      errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
      message = error instanceof Error ? error.message : String(error);
      status = 500;
    }

    set.status = status;
    set.headers['Content-Type'] = 'application/json';
    const response: Record<string, unknown> = {
      code: errorCode,
      message,
      status,
    };
    if (errors) {
      response.errors = errors;
    }
    return response;
  });
}
