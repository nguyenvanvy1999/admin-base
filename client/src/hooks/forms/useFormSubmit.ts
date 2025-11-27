import { useAppMutation } from '@client/hooks/api/useMutation';
import type { FormInstance } from 'antd';
import { useCallback } from 'react';

interface UseFormSubmitOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: unknown, variables: TVariables) => void;
  successMessage?: string;
  errorMessage?: string;
  resetFormOnSuccess?: boolean;
}

/**
 * Hook for standardized form submission with React Query mutations
 */
export function useFormSubmit<TData = unknown, TVariables = unknown>(
  form: FormInstance,
  options: UseFormSubmitOptions<TData, TVariables>,
) {
  const {
    mutationFn,
    onSuccess,
    onError,
    successMessage,
    errorMessage,
    resetFormOnSuccess = false,
  } = options;

  const mutation = useAppMutation<TData, unknown, TVariables>({
    mutationFn,
    successMessage,
    errorMessage,
    onSuccess: (data, variables) => {
      if (resetFormOnSuccess) {
        form.resetFields();
      }
      onSuccess?.(data, variables);
    },
    onError,
  });

  const submit = useCallback(
    async (values: TVariables) => {
      try {
        await mutation.mutateAsync(values);
      } catch (error) {
        // Error is already handled by useAppMutation
      }
    },
    [mutation],
  );

  return {
    submit,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: () => form.resetFields(),
  };
}
