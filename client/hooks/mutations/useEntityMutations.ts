import { entityService } from '@client/services';
import { toast } from '@client/utils/toast';
import type { IUpsertEntityDto } from '@server/dto/entity.dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateEntityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<IUpsertEntityDto, 'id'>) => {
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
    mutationFn: (data: IUpsertEntityDto) => {
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

export const useDeleteManyEntitiesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => {
      return entityService.deleteManyEntities(ids);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['entities'] });
      toast.success('Entities deleted successfully');
    },
  });
};
