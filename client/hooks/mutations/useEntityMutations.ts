import { entityService } from '@client/services';
import type {
  EntityDeleteResponse,
  EntityResponse,
  IUpsertEntityDto,
} from '@server/dto/entity.dto';
import { createMutationHooks } from './createMutationHooks';

const entityMutations = createMutationHooks<
  IUpsertEntityDto,
  EntityResponse,
  EntityDeleteResponse
>({
  create: (data) => entityService.createEntity(data),
  update: (data) => entityService.updateEntity(data),
  delete: (id) => entityService.deleteEntity(id),
  deleteMany: (ids) => entityService.deleteManyEntities(ids),
});

export const {
  useCreateMutation: useCreateEntityMutation,
  useUpdateMutation: useUpdateEntityMutation,
  useDeleteMutation: useDeleteEntityMutation,
  useDeleteManyMutation: useDeleteManyEntitiesMutation,
} = entityMutations({
  queryKey: 'entities',
  invalidateKeys: [['entity']],
  successMessages: {
    create: 'Entity created successfully',
    update: 'Entity updated successfully',
    delete: 'Entity deleted successfully',
    deleteMany: 'Entities deleted successfully',
  },
});
