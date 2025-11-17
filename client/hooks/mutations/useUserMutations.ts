import { userService } from '@client/services';
import type { IUpsertUserDto } from '@server/dto/admin/user.dto';
import { createMutationHooks } from './createMutationHooks';

const userMutations = createMutationHooks<IUpsertUserDto, null, null>({
  create: (data) => userService.createUser(data),
  update: (data) => userService.updateUser(data),
  deleteMany: (ids) => userService.deleteManyUsers(ids),
});

export const {
  useCreateMutation: useCreateUserMutation,
  useUpdateMutation: useUpdateUserMutation,
  useDeleteManyMutation: useDeleteManyUsersMutation,
} = userMutations({
  queryKey: 'admin-users',
  invalidateKeys: [['admin-users']],
  successMessages: {
    create: 'User created successfully',
    update: 'User updated successfully',
    deleteMany: 'Users deleted successfully',
  },
});
