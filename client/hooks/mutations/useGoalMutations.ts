import { goalService } from '@client/services';
import { toast } from '@client/utils/toast';
import type { IUpsertGoalDto } from '@server/dto/goal.dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export const useCreateGoalMutation = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<IUpsertGoalDto, 'id'>) =>
      goalService.createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success(
        t('goals.createSuccess', {
          defaultValue: 'Goal created successfully',
        }),
      );
    },
    onError: (error: Error) => {
      toast.error(
        error.message ||
          t('goals.createError', { defaultValue: 'Failed to create goal' }),
      );
    },
  });
};

export const useUpdateGoalMutation = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: IUpsertGoalDto) => goalService.updateGoal(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ['goal', variables.id] });
        queryClient.invalidateQueries({
          queryKey: ['goal-detail', variables.id],
        });
      }
      toast.success(
        t('goals.updateSuccess', {
          defaultValue: 'Goal updated successfully',
        }),
      );
    },
    onError: (error: Error) => {
      toast.error(
        error.message ||
          t('goals.updateError', { defaultValue: 'Failed to update goal' }),
      );
    },
  });
};

export const useDeleteManyGoalsMutation = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => goalService.deleteManyGoals(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success(
        t('goals.deleteManySuccess', {
          defaultValue: 'Goals deleted successfully',
        }),
      );
    },
    onError: (error: Error) => {
      toast.error(
        error.message ||
          t('goals.deleteManyError', {
            defaultValue: 'Failed to delete goals',
          }),
      );
    },
  });
};
