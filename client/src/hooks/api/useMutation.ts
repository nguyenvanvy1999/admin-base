import { handleApiError } from '@client/lib/api/errorHandler';
import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation as useReactMutation } from '@tanstack/react-query';
import { message } from 'antd';

/**
 * Enhanced useMutation hook with standardized error handling and success notifications
 */
export function useAppMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    successMessage?: string;
    errorMessage?: string;
  },
): UseMutationResult<TData, TError, TVariables, TContext> {
  const {
    successMessage,
    errorMessage,
    onSuccess,
    onError,
    ...mutationOptions
  } = options;

  const mutation = useReactMutation<TData, TError, TVariables, TContext>({
    ...mutationOptions,
    onSuccess: (data, variables, context) => {
      if (successMessage) {
        message.success(successMessage);
      }
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (errorMessage) {
        message.error(errorMessage);
      } else {
        handleApiError(error);
      }
      onError?.(error, variables, context);
    },
  });

  return mutation;
}
