import useToast from '@client/hooks/useToast';
import { api } from '@client/libs/api';
import type { TagFormData } from '@client/types/tag';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateTagMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<TagFormData, 'id'>) => {
      const response = await api.api.tags.post(data);
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'An unknown error occurred',
        );
      }
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      showSuccess('Tag created successfully');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

export const useUpdateTagMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TagFormData) => {
      if (!data.id) {
        throw new Error('Tag ID is required for update');
      }

      const response = await api.api.tags.post(data);
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'An unknown error occurred',
        );
      }
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      await queryClient.invalidateQueries({ queryKey: ['tag'] });
      showSuccess('Tag updated successfully');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

export const useDeleteTagMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagId: string) => {
      const response = await api.api.tags({ id: tagId }).delete();
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'An unknown error occurred',
        );
      }
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      showSuccess('Tag deleted successfully');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};
