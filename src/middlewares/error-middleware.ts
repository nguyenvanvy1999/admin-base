import Elysia from 'elysia';
import { AppError, ErrorCode } from '../constants/error';
import { logger } from '../libs/logger';

export const errorHandler = new Elysia().onError(({ error, code, set }) => {
  let errorCode: string;
  let status: number;
  let message: string;
  let errors: unknown;

  if (error instanceof AppError) {
    errorCode = error.code;
    message = error.message;
    status = typeof set.status === 'number' ? set.status : 400;
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
