import useToast from '@client/hooks/useToast';
import { api } from '@client/libs/api';
import type { CategoryFormData } from '@client/types/category';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateCategoryMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<CategoryFormData, 'id'>) => {
      const payload = {
        ...data,
        parentId: data.parentId ?? undefined,
        icon: data.icon ?? undefined,
        color: data.color ?? undefined,
      };
      const response = await api.api.categories.post(payload);
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'An unknown error occurred',
        );
      }
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      showSuccess('Category created successfully');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

export const useUpdateCategoryMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CategoryFormData) => {
      if (!data.id) {
        throw new Error('Category ID is required for update');
      }

      const { id, ...rest } = data;
      const updateData = {
        ...rest,
        parentId: rest.parentId ?? undefined,
        icon: rest.icon ?? undefined,
        color: rest.color ?? undefined,
      };
      const response = await api.api.categories({ id }).put(updateData);
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'An unknown error occurred',
        );
      }
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.invalidateQueries({ queryKey: ['category'] });
      showSuccess('Category updated successfully');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

export const useDeleteCategoryMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      const response = await api.api.categories({ id: categoryId }).delete();
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'An unknown error occurred',
        );
      }
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      showSuccess('Category deleted successfully');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};
