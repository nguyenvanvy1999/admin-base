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

      if (
        errorCode === ErrorCode.UNAUTHORIZED ||
        errorCode === ErrorCode.INVALID_TOKEN ||
        errorCode === ErrorCode.EXPIRED_TOKEN ||
        errorCode === ErrorCode.SESSION_EXPIRED
      ) {
        status = 401;
      } else if (
        errorCode === ErrorCode.FORBIDDEN ||
        errorCode === ErrorCode.PERMISSION_DENIED
      ) {
        status = 403;
      } else if (
        errorCode === ErrorCode.NOT_FOUND ||
        errorCode === ErrorCode.ENTITY_NOT_FOUND ||
        errorCode === ErrorCode.ACCOUNT_NOT_FOUND ||
        errorCode === ErrorCode.CURRENCY_NOT_FOUND ||
        errorCode === ErrorCode.INVESTMENT_NOT_FOUND ||
        errorCode === ErrorCode.USER_NOT_FOUND ||
        errorCode === ErrorCode.BUDGET_NOT_FOUND ||
        errorCode === ErrorCode.BUDGET_PERIOD_NOT_FOUND ||
        errorCode === ErrorCode.CATEGORY_NOT_FOUND ||
        errorCode === ErrorCode.ITEM_NOT_FOUND
      ) {
        status = 404;
      } else if (errorCode === ErrorCode.INTERNAL_SERVER_ERROR) {
        status = 500;
      } else {
        status = 400;
      }
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
