import { budgetService } from '@client/services';
import { toast } from '@client/utils/toast';
import type { IUpsertBudgetDto } from '@server/dto/budget.dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export const useCreateBudgetMutation = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<IUpsertBudgetDto, 'id'>) =>
      budgetService.createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success(
        t('budgets.createSuccess', {
          defaultValue: 'Budget created successfully',
        }),
      );
    },
    onError: (error: Error) => {
      toast.error(
        error.message ||
          t('budgets.createError', { defaultValue: 'Failed to create budget' }),
      );
    },
  });
};

export const useUpdateBudgetMutation = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: IUpsertBudgetDto) => budgetService.updateBudget(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ['budget', variables.id] });
        queryClient.invalidateQueries({
          queryKey: ['budget-periods', variables.id],
        });
      }
      toast.success(
        t('budgets.updateSuccess', {
          defaultValue: 'Budget updated successfully',
        }),
      );
    },
    onError: (error: Error) => {
      toast.error(
        error.message ||
          t('budgets.updateError', { defaultValue: 'Failed to update budget' }),
      );
    },
  });
};

export const useDeleteManyBudgetsMutation = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => budgetService.deleteManyBudgets(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success(
        t('budgets.deleteManySuccess', {
          defaultValue: 'Budgets deleted successfully',
        }),
      );
    },
    onError: (error: Error) => {
      toast.error(
        error.message ||
          t('budgets.deleteManyError', {
            defaultValue: 'Failed to delete budgets',
          }),
      );
    },
  });
};
