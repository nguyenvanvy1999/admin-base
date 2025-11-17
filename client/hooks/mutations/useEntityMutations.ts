import { entityService } from '@client/services';
import type { ActionRes } from '@server/dto/common.dto';
import type { EntityResponse, IUpsertEntityDto } from '@server/dto/entity.dto';
import { createMutationHooks } from './createMutationHooks';

const entityMutations = createMutationHooks<
  IUpsertEntityDto,
  EntityResponse,
  ActionRes
>({
  create: (data) => entityService.createEntity(data),
  update: (data) => entityService.updateEntity(data),
  deleteMany: (ids) => entityService.deleteManyEntities(ids),
});

export const {
  useCreateMutation: useCreateEntityMutation,
  useUpdateMutation: useUpdateEntityMutation,
  useDeleteManyMutation: useDeleteManyEntitiesMutation,
} = entityMutations({
  queryKey: 'entities',
  invalidateKeys: [['entity']],
  successMessages: {
    create: 'Entity created successfully',
    update: 'Entity updated successfully',
    deleteMany: 'Entities deleted successfully',
  },
});
