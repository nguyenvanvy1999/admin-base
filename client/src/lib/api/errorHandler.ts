import type { ApiErrorResponse } from '@client/types/api';
import { message } from 'antd';
import type { AxiosError } from 'axios';

export interface ApiError extends Error {
  statusCode?: number;
  response?: ApiErrorResponse;
}

/**
 * Handle API errors and show notifications
 * Note: This function should be called from within React components or hooks
 * to ensure Ant Design message API is available
 */
export function handleApiError(error: unknown): ApiError {
  if (typeof error === 'object' && error !== null) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    if (axiosError.response) {
      const { status, data } = axiosError.response;
      const errorMessage =
        data?.message || axiosError.message || 'Có lỗi xảy ra';

      // Show error notification
      message.error({
        content: errorMessage,
        duration: 5,
      });

      return {
        name: 'ApiError',
        message: errorMessage,
        statusCode: status,
        response: data,
      } as ApiError;
    }

    if (axiosError.request) {
      const errorMessage =
        'Không thể kết nối đến server. Vui lòng thử lại sau.';
      message.error({
        content: errorMessage,
        duration: 5,
      });

      return {
        name: 'NetworkError',
        message: errorMessage,
      } as ApiError;
    }
  }

  const errorMessage =
    error instanceof Error ? error.message : 'Có lỗi không xác định xảy ra';
  message.error({
    content: errorMessage,
    duration: 5,
  });

  return {
    name: 'UnknownError',
    message: errorMessage,
  } as ApiError;
}

/**
 * Handle API errors without showing notifications (for custom handling)
 */
export function parseApiError(error: unknown): ApiError {
  if (typeof error === 'object' && error !== null) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    if (axiosError.response) {
      const { status, data } = axiosError.response;
      const errorMessage =
        data?.message || axiosError.message || 'Có lỗi xảy ra';

      return {
        name: 'ApiError',
        message: errorMessage,
        statusCode: status,
        response: data,
      } as ApiError;
    }

    if (axiosError.request) {
      return {
        name: 'NetworkError',
        message: 'Không thể kết nối đến server. Vui lòng thử lại sau.',
      } as ApiError;
    }
  }

  return {
    name: 'UnknownError',
    message:
      error instanceof Error ? error.message : 'Có lỗi không xác định xảy ra',
  } as ApiError;
}
