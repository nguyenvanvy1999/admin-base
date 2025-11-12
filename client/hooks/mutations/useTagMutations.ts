import { tagService } from '@client/services';
import type { TagFormData } from '@client/types/tag';
import { toast } from '@client/utils/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateTagMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<TagFormData, 'id'>) => {
      return tagService.createTag(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag created successfully');
    },
  });
};

export const useUpdateTagMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TagFormData & { id: string }) => {
      return tagService.updateTag(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag updated successfully');
    },
  });
};

export const useDeleteTagMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: string) => {
      return tagService.deleteTag(tagId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag deleted successfully');
    },
  });
};
