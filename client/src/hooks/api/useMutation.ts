import { handleApiError } from '@client/lib/api/errorHandler';
import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation as useReactMutation } from '@tanstack/react-query';
import { message } from 'antd';

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
    onSuccess: (data, variables, context, mutation) => {
      if (successMessage) {
        message.success(successMessage);
      }
      onSuccess?.(data, variables, context, mutation);
    },
    onError: (error, variables, context, mutation) => {
      if (errorMessage) {
        message.error(errorMessage);
      } else {
        handleApiError(error);
      }
      onError?.(error, variables, context, mutation);
    },
  });

  return mutation;
}
