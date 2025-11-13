import i18n from '@client/i18n';
import { toast } from '@client/utils/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type ServiceWithCRUD<TUpsertDto, TResponse, TDeleteResponse> = {
  create: (data: Omit<TUpsertDto, 'id'>) => Promise<TResponse>;
  update: (data: TUpsertDto) => Promise<TResponse>;
  delete: (id: string) => Promise<TDeleteResponse>;
  deleteMany?: (ids: string[]) => Promise<TDeleteResponse>;
};

type CreateMutationHooksOptions = {
  queryKey: string | string[];
  successMessages?: {
    create?: string;
    update?: string;
    delete?: string;
    deleteMany?: string;
  };
  errorMessages?: {
    create?: string;
    update?: string;
    delete?: string;
    deleteMany?: string;
  };
  invalidateKeys?: string[][];
  onSuccess?: {
    create?: () => void | Promise<void>;
    update?: () => void | Promise<void>;
    delete?: () => void | Promise<void>;
    deleteMany?: () => void | Promise<void>;
  };
};

export function createMutationHooks<
  TUpsertDto extends { id?: string },
  TResponse,
  TDeleteResponse,
>(service: ServiceWithCRUD<TUpsertDto, TResponse, TDeleteResponse>) {
  return (options: CreateMutationHooksOptions) => {
    const {
      queryKey,
      successMessages = {},
      errorMessages = {},
      invalidateKeys = [],
      onSuccess: onSuccessCallbacks = {},
    } = options;

    const queryKeys = Array.isArray(queryKey) ? queryKey : [queryKey];
    const allInvalidateKeys = [...queryKeys, ...invalidateKeys];

    const useCreateMutation = () => {
      const queryClient = useQueryClient();

      return useMutation({
        mutationFn: (data: Omit<TUpsertDto, 'id'>) => {
          return service.create(data);
        },
        onSuccess: async () => {
          for (const key of allInvalidateKeys) {
            await queryClient.invalidateQueries({
              queryKey: Array.isArray(key) ? key : [key],
            });
          }
          if (successMessages.create) {
            toast.success(successMessages.create);
          }
          await onSuccessCallbacks.create?.();
        },
        onError: (error: Error & { code?: string; message?: string }) => {
          const errorCode = error.code || 'ise';
          const i18nKey = `api.${errorCode.toLowerCase()}`;
          const errorMessage =
            (i18n.exists(i18nKey) ? i18n.t(i18nKey as any) : null) ||
            error.message ||
            errorMessages.create ||
            'Failed to create. Please try again.';
          toast.error(errorMessage);
        },
      });
    };

    const useUpdateMutation = () => {
      const queryClient = useQueryClient();

      return useMutation({
        mutationFn: (data: TUpsertDto) => {
          if (!data.id) {
            throw new Error('ID is required for update');
          }
          return service.update(data);
        },
        onSuccess: async () => {
          for (const key of allInvalidateKeys) {
            await queryClient.invalidateQueries({
              queryKey: Array.isArray(key) ? key : [key],
            });
          }
          if (successMessages.update) {
            toast.success(successMessages.update);
          }
          await onSuccessCallbacks.update?.();
        },
        onError: (error: Error & { code?: string; message?: string }) => {
          const errorCode = error.code || 'ise';
          const i18nKey = `api.${errorCode.toLowerCase()}`;
          const errorMessage =
            (i18n.exists(i18nKey) ? i18n.t(i18nKey as any) : null) ||
            error.message ||
            errorMessages.update ||
            'Failed to update. Please try again.';
          toast.error(errorMessage);
        },
      });
    };

    const useDeleteMutation = () => {
      const queryClient = useQueryClient();

      return useMutation({
        mutationFn: (id: string) => {
          return service.delete(id);
        },
        onSuccess: async () => {
          for (const key of allInvalidateKeys) {
            await queryClient.invalidateQueries({
              queryKey: Array.isArray(key) ? key : [key],
            });
          }
          if (successMessages.delete) {
            toast.success(successMessages.delete);
          }
          await onSuccessCallbacks.delete?.();
        },
        onError: (error: Error & { code?: string; message?: string }) => {
          const errorCode = error.code || 'ise';
          const i18nKey = `api.${errorCode.toLowerCase()}`;
          const errorMessage =
            (i18n.exists(i18nKey) ? i18n.t(i18nKey as any) : null) ||
            error.message ||
            errorMessages.delete ||
            'Failed to delete. Please try again.';
          toast.error(errorMessage);
        },
      });
    };

    const useDeleteManyMutation = service.deleteMany
      ? () => {
          const queryClient = useQueryClient();

          return useMutation({
            mutationFn: (ids: string[]) => {
              return service.deleteMany!(ids);
            },
            onSuccess: async () => {
              for (const key of allInvalidateKeys) {
                await queryClient.invalidateQueries({
                  queryKey: Array.isArray(key) ? key : [key],
                });
              }
              if (successMessages.deleteMany) {
                toast.success(successMessages.deleteMany);
              }
              await onSuccessCallbacks.deleteMany?.();
            },
            onError: (error: Error & { code?: string; message?: string }) => {
              const errorCode = error.code || 'ise';
              const i18nKey = `api.${errorCode.toLowerCase()}`;
              const errorMessage =
                (i18n.exists(i18nKey) ? i18n.t(i18nKey as any) : null) ||
                error.message ||
                errorMessages.deleteMany ||
                'Failed to delete. Please try again.';
              toast.error(errorMessage);
            },
          });
        }
      : undefined;

    return {
      useCreateMutation,
      useUpdateMutation,
      useDeleteMutation,
      ...(useDeleteManyMutation && { useDeleteManyMutation }),
    };
  };
}
