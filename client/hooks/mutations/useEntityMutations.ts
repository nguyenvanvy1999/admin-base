import useToast from '@client/hooks/useToast';
import { api } from '@client/libs/api';
import type { EntityFormData } from '@client/types/entity';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateEntityMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<EntityFormData, 'id'>) => {
      const response = await api.api.entities.post(data);
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'An unknown error occurred',
        );
      }
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['entities'] });
      showSuccess('Entity created successfully');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

export const useUpdateEntityMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EntityFormData) => {
      if (!data.id) {
        throw new Error('Entity ID is required for update');
      }

      const response = await api.api.entities.post(data);
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'An unknown error occurred',
        );
      }
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['entities'] });
      await queryClient.invalidateQueries({ queryKey: ['entity'] });
      showSuccess('Entity updated successfully');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

export const useDeleteEntityMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entityId: string) => {
      const response = await api.api.entities({ id: entityId }).delete();
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'An unknown error occurred',
        );
      }
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['entities'] });
      showSuccess('Entity deleted successfully');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};
