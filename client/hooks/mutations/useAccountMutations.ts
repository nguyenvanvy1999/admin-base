import { accountService } from '@client/services';
import type { AccountFormData } from '@client/types/account';
import { toast } from '@client/utils/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateAccountMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<AccountFormData, 'id'>) => {
      return accountService.createAccount(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account created successfully');
    },
  });
};

export const useUpdateAccountMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AccountFormData) => {
      if (!data.id) {
        throw new Error('Account ID is required for update');
      }

      return accountService.updateAccount(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['account'] });
      toast.success('Account updated successfully');
    },
  });
};

export const useDeleteAccountMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => {
      return accountService.deleteAccount(accountId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account deleted successfully');
    },
  });
};
