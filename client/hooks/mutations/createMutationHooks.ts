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
