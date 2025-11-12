import useToast from '@client/hooks/useToast';
import { del, post } from '@client/libs/http';
import type { TagFormData } from '@client/types/tag';
import type { TagDeleteResponse, TagResponse } from '@server/dto/tag.dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateTagMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<TagFormData, 'id'>) => {
      return await post<TagResponse, Omit<TagFormData, 'id'>>(
        '/api/tags',
        data,
      );
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

      return await post<TagResponse, TagFormData>('/api/tags', data);
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
      return await del<TagDeleteResponse>(`/api/tags/${tagId}`);
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
