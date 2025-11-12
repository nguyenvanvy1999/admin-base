import { entityService } from '@client/services';
import type { EntityFormData } from '@client/types/entity';
import { toast } from '@client/utils/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateEntityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<EntityFormData, 'id'>) => {
      return entityService.createEntity(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['entities'] });
      toast.success('Entity created successfully');
    },
  });
};

export const useUpdateEntityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EntityFormData) => {
      if (!data.id) {
        throw new Error('Entity ID is required for update');
      }

      return entityService.updateEntity(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['entities'] });
      await queryClient.invalidateQueries({ queryKey: ['entity'] });
      toast.success('Entity updated successfully');
    },
  });
};

export const useDeleteEntityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entityId: string) => {
      return entityService.deleteEntity(entityId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['entities'] });
      toast.success('Entity deleted successfully');
    },
  });
};
