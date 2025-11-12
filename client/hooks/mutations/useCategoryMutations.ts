import { categoryService } from '@client/services';
import { toast } from '@client/utils/toast';
import type { IUpsertCategoryDto } from '@server/dto/category.dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<IUpsertCategoryDto, 'id'>) => {
      const payload = {
        ...data,
        parentId: data.parentId ?? undefined,
        icon: data.icon ?? undefined,
        color: data.color ?? undefined,
      };
      return categoryService.createCategory(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created successfully');
    },
  });
};

export const useUpdateCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: IUpsertCategoryDto) => {
      if (!data.id) {
        throw new Error('Category ID is required for update');
      }

      return categoryService.updateCategory(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.invalidateQueries({ queryKey: ['category'] });
      toast.success('Category updated successfully');
    },
  });
};

export const useDeleteCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryId: string) => {
      return categoryService.deleteCategory(categoryId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted successfully');
    },
  });
};
