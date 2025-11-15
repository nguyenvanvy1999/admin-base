import { accountService } from '@client/services';
import type {
  AccountResponse,
  IUpsertAccountDto,
} from '@server/dto/account.dto';
import type { ActionRes } from '@server/dto/common.dto';
import { createMutationHooks } from './createMutationHooks';

const accountMutations = createMutationHooks<
  IUpsertAccountDto,
  AccountResponse,
  ActionRes
>({
  create: (data) => accountService.createAccount(data),
  update: (data) => accountService.updateAccount(data),
  delete: (id) => accountService.deleteAccount(id),
});

export const {
  useCreateMutation: useCreateAccountMutation,
  useUpdateMutation: useUpdateAccountMutation,
  useDeleteMutation: useDeleteAccountMutation,
} = accountMutations({
  queryKey: 'accounts',
  invalidateKeys: [['account']],
  successMessages: {
    create: 'Account created successfully',
    update: 'Account updated successfully',
    delete: 'Account deleted successfully',
  },
});
