import { tagService } from '@client/services';
import type { ActionRes } from '@server/dto/common.dto';
import type { IUpsertTagDto, TagResponse } from '@server/dto/tag.dto';
import { createMutationHooks } from './createMutationHooks';

const tagMutations = createMutationHooks<IUpsertTagDto, TagResponse, ActionRes>(
  {
    create: (data) => tagService.createTag(data),
    update: (data) =>
      tagService.updateTag(data as IUpsertTagDto & { id: string }),
    deleteMany: (ids) => tagService.deleteManyTags(ids),
  },
);

export const {
  useCreateMutation: useCreateTagMutation,
  useUpdateMutation: useUpdateTagMutation,
  useDeleteManyMutation: useDeleteManyTagsMutation,
} = tagMutations({
  queryKey: 'tags',
  successMessages: {
    create: 'Tag created successfully',
    update: 'Tag updated successfully',
    deleteMany: 'Tags deleted successfully',
  },
});
