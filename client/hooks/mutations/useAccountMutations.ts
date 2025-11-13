import { accountService } from '@client/services';
import type {
  AccountDeleteResponse,
  AccountResponse,
  IUpsertAccountDto,
} from '@server/dto/account.dto';
import { createMutationHooks } from './createMutationHooks';

const accountMutations = createMutationHooks<
  IUpsertAccountDto,
  AccountResponse,
  AccountDeleteResponse
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
