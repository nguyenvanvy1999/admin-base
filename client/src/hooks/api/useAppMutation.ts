import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { App } from 'antd';
import { useTranslation } from 'react-i18next';

// Type for mutation callbacks
export interface MutationCallbacks<
  TData = unknown,
  TError = Error,
  TVariables = unknown,
> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: TError, variables: TVariables) => void;
}

// Type for error with response
export interface ApiError {
  response?: {
    data?: {
      code?: string;
      message?: string;
    };
  };
  message?: string;
}

// Options for useAppMutation
export interface AppMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = unknown,
> extends MutationCallbacks<TData, TError, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  // Query invalidation
  invalidateKeys?:
    | QueryKey[]
    | ((variables: TVariables, data: TData) => QueryKey[]);
  // i18n message keys
  successMessageKey?: string;
  successMessageDefault?: string;
  errorMessageKey?: string;
  errorMessageDefault?: string;
  // Error code mapping for custom error messages
  errorCodeMap?: Record<string, string>;
  // Skip automatic messages
  skipSuccessMessage?: boolean;
  skipErrorMessage?: boolean;
}

/**
 * Generic mutation hook wrapper that handles:
 * - Query invalidation
 * - Success/error message handling
 * - Error code mapping
 * - i18n support
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
    onSuccess,
    onError,
  } = options;

  return useMutation<TData, TError, TVariables>({
    mutationFn,
    onSuccess: (data, variables, context) => {
      // Invalidate queries
      if (invalidateKeys) {
        const keys =
          typeof invalidateKeys === 'function'
            ? invalidateKeys(variables, data)
            : invalidateKeys;

        keys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Show success message
      if (!skipSuccessMessage && successMessageKey) {
        messageApi?.success(t(successMessageKey, successMessageDefault));
      }

      // Call custom onSuccess
      onSuccess?.(data, variables);
    },
    onError: (error, variables, context) => {
      // Handle error message
      if (!skipErrorMessage) {
        let errorMessage = errorMessageDefault;

        // Try to get error code
        const apiError = error as ApiError;
        const errorCode = apiError?.response?.data?.code;

        // Use custom error message from code map
        if (errorCode && errorCodeMap?.[errorCode]) {
          errorMessage = errorCodeMap[errorCode];
        } else if (errorMessageKey) {
          // Use i18n error message
          const errorDetail =
            apiError?.response?.data?.message ||
            apiError?.message ||
            'Unknown error';
          errorMessage = t(errorMessageKey, errorMessageDefault, {
            error: errorDetail,
          });
        }

        messageApi?.error(errorMessage);
      }

      // Call custom onError
      onError?.(error, variables);
    },
  });
}
