import Elysia from 'elysia';
import { logger } from '../libs/logger';

export const errorHandler = new Elysia().onError(({ error, code, set }) => {
  ({ code, error, set }: any) => {
    if (code === 'UNKNOWN') {
      //user throw error
      set.status = 400;
      return {
        message: error.message,
        status: 400,
      };
    }
    if (code === 'INTERNAL_SERVER_ERROR' || code === 'PARSE') {
      logger.error(`Request error occurred ${JSON.stringify({ code, error })}`);
      set.status = 500;
      return {
        message: error.message,
        status: 500,
      };
    }
    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        message: error.message,
        errors: error.errors,
        status: 400,
      };
    }
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return {
        message: error.message,
        status: 404,
      };
    }

    set.status = 500;
    return {
      message: error.message,
      status: 500,
    };
  };
});
