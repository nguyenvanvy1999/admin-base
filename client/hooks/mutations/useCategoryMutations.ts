import useToast from '@client/hooks/useToast';
import { del, post, put } from '@client/libs/http';
import type { CategoryFormData } from '@client/types/category';
import type {
  CategoryDeleteResponse,
  CategoryResponse,
} from '@server/src/dto/category.dto';
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
      return await post<CategoryResponse, typeof payload>(
        '/api/categories',
        payload,
      );
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
      return await put<CategoryResponse, typeof updateData>(
        `/api/categories/${id}`,
        updateData,
      );
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
      return await del<CategoryDeleteResponse>(`/api/categories/${categoryId}`);
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
