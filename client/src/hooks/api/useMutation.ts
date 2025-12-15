import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { App } from 'antd';
import { useTranslation } from 'react-i18next';
import { handleApiError } from 'src/lib/api/errorHandler';

export interface ApiError {
  response?: {
    data?: {
      code?: string;
      message?: string;
    };
  };
  message?: string;
}

export interface MutationCallbacks<
  TData = unknown,
  TError = Error,
  TVariables = unknown,
> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: TError, variables: TVariables) => void;
}

export interface AppMutationOptions<
  TData = unknown,
  TError = ApiError,
  TVariables = unknown,
> extends MutationCallbacks<TData, TError, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateKeys?:
    | QueryKey[]
    | ((variables: TVariables, data: TData) => QueryKey[]);
  successMessageKey?: string;
  successMessageDefault?: string;
  errorMessageKey?: string;
  errorMessageDefault?: string;
  errorCodeMap?: Record<string, string>;
  skipSuccessMessage?: boolean;
  skipErrorMessage?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Generic mutation hook wrapper that handles:
 * - Query invalidation
 * - Success/error message handling
 * - Error code mapping
 * - i18n support
 * - Backward compatibility with simple message options
 */
export function useAppMutation<
  TData = unknown,
  TError = ApiError,
  TVariables = unknown,
>(options: AppMutationOptions<TData, TError, TVariables>) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { message: messageApi } = App.useApp();

  const {
    mutationFn,
    invalidateKeys,
    successMessageKey,
    successMessageDefault = 'Operation successful',
    errorMessageKey,
    errorMessageDefault = 'An error occurred',
    errorCodeMap,
    skipSuccessMessage = false,
    skipErrorMessage = false,
    successMessage,
    errorMessage,
    onSuccess,
    onError,
  } = options;

  return useMutation<TData, TError, TVariables>({
    mutationFn,
    onSuccess: (data, variables) => {
      if (invalidateKeys) {
        const keys =
          typeof invalidateKeys === 'function'
            ? invalidateKeys(variables, data)
            : invalidateKeys;

        keys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      if (!skipSuccessMessage) {
        if (successMessage) {
          messageApi?.success(successMessage);
        } else if (successMessageKey) {
          messageApi?.success(t(successMessageKey, successMessageDefault));
        }
      }

      onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      if (!skipErrorMessage) {
        if (errorMessage) {
          messageApi?.error(errorMessage);
        } else {
          let finalErrorMessage = errorMessageDefault;

          const apiError = error as ApiError;
          const errorCode = apiError?.response?.data?.code;

          if (errorCode && errorCodeMap?.[errorCode]) {
            finalErrorMessage = errorCodeMap[errorCode];
          } else if (errorMessageKey) {
            const errorDetail =
              apiError?.response?.data?.message ||
              apiError?.message ||
              'Unknown error';
            finalErrorMessage = t(errorMessageKey, errorMessageDefault, {
              error: errorDetail,
            });
          } else {
            handleApiError(error);
            onError?.(error, variables);
            return;
          }

          messageApi?.error(finalErrorMessage);
        }
      }

      onError?.(error, variables);
    },
  });
}

export { useAppMutation as useMutation };
