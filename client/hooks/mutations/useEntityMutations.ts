import useToast from '@client/hooks/useToast';
import { del, post } from '@client/libs/http';
import type { EntityFormData } from '@client/types/entity';
import type {
  EntityDeleteResponse,
  EntityResponse,
} from '@server/dto/entity.dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateEntityMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<EntityFormData, 'id'>) => {
      return await post<EntityResponse, Omit<EntityFormData, 'id'>>(
        '/api/entities',
        data,
      );
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

      return await post<EntityResponse, EntityFormData>('/api/entities', data);
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
      return await del<EntityDeleteResponse>(`/api/entities/${entityId}`);
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
