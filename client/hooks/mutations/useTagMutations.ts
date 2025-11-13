import { tagService } from '@client/services';
import type {
  IUpsertTagDto,
  TagDeleteResponse,
  TagResponse,
} from '@server/dto/tag.dto';
import { createMutationHooks } from './createMutationHooks';

const tagMutations = createMutationHooks<
  IUpsertTagDto,
  TagResponse,
  TagDeleteResponse
>({
  create: (data) => tagService.createTag(data),
  update: (data) =>
    tagService.updateTag(data as IUpsertTagDto & { id: string }),
  delete: (id) => tagService.deleteTag(id),
  deleteMany: (ids) => tagService.deleteManyTags(ids),
});

export const {
  useCreateMutation: useCreateTagMutation,
  useUpdateMutation: useUpdateTagMutation,
  useDeleteMutation: useDeleteTagMutation,
  useDeleteManyMutation: useDeleteManyTagsMutation,
} = tagMutations({
  queryKey: 'tags',
  successMessages: {
    create: 'Tag created successfully',
    update: 'Tag updated successfully',
    delete: 'Tag deleted successfully',
    deleteMany: 'Tags deleted successfully',
  },
});
