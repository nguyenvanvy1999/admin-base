import { message } from 'antd';
import type { AxiosError } from 'axios';
import {
  GENERIC_ERROR_KEY,
  NETWORK_ERROR_KEY,
  resolveErrorTranslationKey,
  UNKNOWN_ERROR_KEY,
} from 'src/constants/errorMessages';
import i18n from 'src/i18n';
import type { ApiErrorResponse } from 'src/types/api';

export interface ApiError extends Error {
  statusCode?: number;
  response?: ApiErrorResponse;
  code?: string;
}

function getMessageFromResponse(
  data?: ApiErrorResponse,
  fallback?: string,
): string {
  const translationKey = resolveErrorTranslationKey(data?.code);
  if (translationKey) {
    return i18n.t(translationKey as any);
  }

  if (data?.message) {
    return data.message;
  }

  if (fallback) {
    return fallback;
  }

  return i18n.t(GENERIC_ERROR_KEY);
}

function buildApiError(axiosError: AxiosError<ApiErrorResponse>): ApiError {
  const response = axiosError.response;
  const status = response?.status;
  const data = response?.data;
  const message = getMessageFromResponse(data, axiosError.message);
  return {
    name: 'ApiError',
    message,
    statusCode: status,
    response: data,
    code: data?.code,
  } as ApiError;
}

export function handleApiError(error: unknown): ApiError {
  if (typeof error === 'object' && error !== null) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    if (axiosError.response) {
      const apiError = buildApiError(axiosError);
      message.error({
        content: apiError.message,
        duration: 5,
      });
      return apiError;
    }

    if (axiosError.request) {
      const errorMessage = i18n.t(NETWORK_ERROR_KEY);
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
    error instanceof Error ? error.message : i18n.t(UNKNOWN_ERROR_KEY);
  message.error({
    content: errorMessage,
    duration: 5,
  });

  return {
    name: 'UnknownError',
    message: errorMessage,
  } as ApiError;
}

export function parseApiError(error: unknown): ApiError {
  if (typeof error === 'object' && error !== null) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    if (axiosError.response) {
      return buildApiError(axiosError);
    }

    if (axiosError.request) {
      return {
        name: 'NetworkError',
        message: i18n.t(NETWORK_ERROR_KEY),
      } as ApiError;
    }
  }

  return {
    name: 'UnknownError',
    message: error instanceof Error ? error.message : i18n.t(UNKNOWN_ERROR_KEY),
  } as ApiError;
}
