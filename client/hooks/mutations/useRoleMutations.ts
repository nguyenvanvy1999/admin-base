import { type IUpsertRoleDto, roleService } from '@client/services/RoleService';
import { createMutationHooks } from './createMutationHooks';

const roleMutations = createMutationHooks<IUpsertRoleDto, null, null>({
  create: (data) => roleService.createRole(data),
  update: (data) => roleService.updateRole(data),
  delete: (id) => roleService.deleteRole(id),
  deleteMany: (ids) => roleService.deleteManyRoles(ids),
});

export const {
  useCreateMutation: useCreateRoleMutation,
  useUpdateMutation: useUpdateRoleMutation,
  useDeleteMutation: useDeleteRoleMutation,
  useDeleteManyMutation: useDeleteManyRolesMutation,
} = roleMutations({
  queryKey: 'admin-roles',
  invalidateKeys: [['admin-roles']],
  successMessages: {
    create: 'Role created successfully',
    update: 'Role updated successfully',
    delete: 'Role deleted successfully',
    deleteMany: 'Roles deleted successfully',
  },
});
