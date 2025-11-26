import type Elysia from 'elysia';
import { logger } from 'src/config/logger';
import { CoreErr, ErrCode, HTTP_STATUS, type IErrorRes } from 'src/share';

export const httpError = () => (app: Elysia) =>
  app.onError(({ code, error, request }) => {
    const handleError = (code: ErrCode, status?: number, detail?: any) => {
      return {
        success: false,
        code,
        t: new Date().toISOString(),
        statusCode: status ?? HTTP_STATUS.HTTP_500_INTERNAL_SERVER_ERROR,
        errors: detail?.errors,
      } satisfies IErrorRes;
    };

    if (error instanceof CoreErr) {
      return handleError(error.code, error.status, error.detail);
    }

    switch (code) {
      case 'VALIDATION':
        logger.error(`Validation error: ${JSON.stringify(error.all)}`);
        return handleError(
          ErrCode.ValidationError,
          HTTP_STATUS.HTTP_400_BAD_REQUEST,
          {
            errors: error.all.map((x) => x.summary),
          },
        );
      case 'NOT_FOUND':
        return handleError(ErrCode.NotFound, HTTP_STATUS.HTTP_404_NOT_FOUND, {
          errors: { path: request.url },
        });
      default:
        logger.error(`Unhandled error: ${error}`);
        if (error instanceof Error) {
          logger.error(`Error stack: ${error.stack}`);
        }
        return handleError(
          ErrCode.InternalError,
          HTTP_STATUS.HTTP_500_INTERNAL_SERVER_ERROR,
          { errors: error },
        );
    }
  });
