import { logger } from '@server/configs/logger';
import type { ErrorCodeType } from '@server/share/constants/error';
import { AppError, ErrorCode } from '@server/share/constants/error';
import type { Elysia } from 'elysia';

const HTTP_STATUS = {
  HTTP_400_BAD_REQUEST: 400,
  HTTP_401_UNAUTHORIZED: 401,
  HTTP_403_FORBIDDEN: 403,
  HTTP_404_NOT_FOUND: 404,
  HTTP_409_CONFLICT: 409,
  HTTP_500_INTERNAL_SERVER_ERROR: 500,
} as const;

function getHttpStatusFromErrorCode(errorCode: ErrorCodeType): number {
  const statusMap: Record<string, number> = {
    [ErrorCode.VALIDATION_ERROR]: HTTP_STATUS.HTTP_400_BAD_REQUEST,
    [ErrorCode.UNAUTHORIZED]: HTTP_STATUS.HTTP_401_UNAUTHORIZED,
    [ErrorCode.INVALID_TOKEN]: HTTP_STATUS.HTTP_401_UNAUTHORIZED,
    [ErrorCode.EXPIRED_TOKEN]: HTTP_STATUS.HTTP_401_UNAUTHORIZED,
    [ErrorCode.SESSION_EXPIRED]: HTTP_STATUS.HTTP_401_UNAUTHORIZED,
    [ErrorCode.FORBIDDEN]: HTTP_STATUS.HTTP_403_FORBIDDEN,
    [ErrorCode.PERMISSION_DENIED]: HTTP_STATUS.HTTP_403_FORBIDDEN,
    [ErrorCode.NOT_FOUND]: HTTP_STATUS.HTTP_404_NOT_FOUND,
    [ErrorCode.ENTITY_NOT_FOUND]: HTTP_STATUS.HTTP_404_NOT_FOUND,
    [ErrorCode.ACCOUNT_NOT_FOUND]: HTTP_STATUS.HTTP_404_NOT_FOUND,
    [ErrorCode.CURRENCY_NOT_FOUND]: HTTP_STATUS.HTTP_404_NOT_FOUND,
    [ErrorCode.INVESTMENT_NOT_FOUND]: HTTP_STATUS.HTTP_404_NOT_FOUND,
    [ErrorCode.USER_NOT_FOUND]: HTTP_STATUS.HTTP_404_NOT_FOUND,
    [ErrorCode.BUDGET_NOT_FOUND]: HTTP_STATUS.HTTP_404_NOT_FOUND,
    [ErrorCode.BUDGET_PERIOD_NOT_FOUND]: HTTP_STATUS.HTTP_404_NOT_FOUND,
    [ErrorCode.CATEGORY_NOT_FOUND]: HTTP_STATUS.HTTP_404_NOT_FOUND,
    [ErrorCode.TAG_NOT_FOUND]: HTTP_STATUS.HTTP_404_NOT_FOUND,
    [ErrorCode.EVENT_NOT_FOUND]: HTTP_STATUS.HTTP_404_NOT_FOUND,
    [ErrorCode.VALUATION_NOT_FOUND]: HTTP_STATUS.HTTP_404_NOT_FOUND,
    [ErrorCode.TRADE_NOT_FOUND]: HTTP_STATUS.HTTP_404_NOT_FOUND,
    [ErrorCode.CONTRIBUTION_NOT_FOUND]: HTTP_STATUS.HTTP_404_NOT_FOUND,
    [ErrorCode.ITEM_NOT_FOUND]: HTTP_STATUS.HTTP_404_NOT_FOUND,
    [ErrorCode.USER_ALREADY_EXISTS]: HTTP_STATUS.HTTP_409_CONFLICT,
    [ErrorCode.ITEM_EXISTS]: HTTP_STATUS.HTTP_409_CONFLICT,
    [ErrorCode.DUPLICATE_NAME]: HTTP_STATUS.HTTP_409_CONFLICT,
  };

  return statusMap[errorCode] ?? HTTP_STATUS.HTTP_500_INTERNAL_SERVER_ERROR;
}

interface ErrorResponse {
  success: false;
  code: string;
  message: string;
  t: string;
  errors?: unknown;
}

export const httpError = () => (app: Elysia) =>
  app.onError(({ code, error, request, set }) => {
    if (error instanceof AppError) {
      const httpStatus = getHttpStatusFromErrorCode(error.code);
      const errorResponse: ErrorResponse = {
        success: false,
        code: error.code,
        message: error.message,
        t: new Date().toISOString(),
      };

      logger.error(`AppError [${error.code}]: ${error.message}`);
      set.status = httpStatus;
      return errorResponse;
    }

    switch (code) {
      case 'VALIDATION': {
        const validationErrors = error.all?.map((x) => x.summary) ?? [];
        logger.error(`Validation error: ${JSON.stringify(error.all)}`);

        const errorResponse: ErrorResponse = {
          success: false,
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          t: new Date().toISOString(),
          errors: validationErrors,
        };

        set.status = HTTP_STATUS.HTTP_400_BAD_REQUEST;
        return errorResponse;
      }

      case 'NOT_FOUND': {
        const errorResponse: ErrorResponse = {
          success: false,
          code: ErrorCode.NOT_FOUND,
          message: `Route not found: ${request.url}`,
          t: new Date().toISOString(),
          errors: { path: request.url },
        };

        set.status = HTTP_STATUS.HTTP_404_NOT_FOUND;
        return errorResponse;
      }

      default: {
        logger.error(`Unhandled error: ${error}`);
        if (error instanceof Error) {
          logger.error(`Error stack: ${error.stack}`);
        }

        const errorResponse: ErrorResponse = {
          success: false,
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message:
            error instanceof Error ? error.message : 'Internal server error',
          t: new Date().toISOString(),
        };

        if (process.env.NODE_ENV !== 'production' && error instanceof Error) {
          errorResponse.errors = { stack: error.stack };
        }

        set.status = HTTP_STATUS.HTTP_500_INTERNAL_SERVER_ERROR;
        return errorResponse;
      }
    }
  });
