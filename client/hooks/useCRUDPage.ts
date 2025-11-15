import type { FormComponentRef } from '@client/components/FormComponent';
import { useMemo, useRef } from 'react';
import type { z } from 'zod';
import { usePageDelete } from './usePageDelete';
import { usePageDialog } from './usePageDialog';
import { usePaginationSorting } from './usePaginationSorting';
import { useZodForm } from './useZodForm';

type SortField = string;

type UseCRUDPageOptions<
  _TItem extends { id: string },
  TFilterSchema extends z.ZodType<any, any, any>,
  TFilterValue extends z.infer<TFilterSchema>,
  TSortField extends SortField,
  TUpsertDto,
> = {
  filterSchema: TFilterSchema;
  defaultFilterValues: TFilterValue;
  defaultSortBy?: TSortField;
  defaultSortOrder?: 'asc' | 'desc';
  defaultPage?: number;
  defaultLimit?: number;
  useQueryHook: (
    queryParams: {
      page?: number;
      limit?: number;
      sortBy?: TSortField;
      sortOrder?: 'asc' | 'desc';
    },
    formRef: React.RefObject<FormComponentRef | null>,
    handleSubmit: (
      onValid: (data: TFilterValue) => void,
      onInvalid?: (errors: any) => void,
    ) => (e?: React.BaseSyntheticEvent) => Promise<void>,
  ) => {
    data: any;
    isLoading: boolean;
    refetch: () => void;
  };
  useCreateMutation: () => {
    mutateAsync: (data: Omit<TUpsertDto, 'id'>) => Promise<any>;
    isPending: boolean;
  };
  useUpdateMutation: () => {
    mutateAsync: (data: TUpsertDto) => Promise<any>;
    isPending: boolean;
  };
  useDeleteMutation: () => {
    mutateAsync: (id: string) => Promise<any>;
    isPending: boolean;
  };
  useDeleteManyMutation?: () => {
    mutateAsync: (ids: string[]) => Promise<any>;
    isPending: boolean;
  };
  onSuccess?: {
    create?: () => void;
    update?: () => void;
    delete?: () => void;
    deleteMany?: () => void;
  };
};

export function useCRUDPage<
  _TItem extends { id: string },
  TFilterSchema extends z.ZodType<any, any, any>,
  TFilterValue extends z.infer<TFilterSchema>,
  TSortField extends SortField,
  TUpsertDto extends { id?: string },
>({
  filterSchema,
  defaultFilterValues,
  defaultSortBy,
  defaultSortOrder = 'desc',
  defaultPage = 1,
  defaultLimit = 20,
  useQueryHook,
  useCreateMutation,
  useUpdateMutation,
  useDeleteMutation,
  useDeleteManyMutation,
  onSuccess,
}: UseCRUDPageOptions<
  _TItem,
  TFilterSchema,
  TFilterValue,
  TSortField,
  TUpsertDto
>) {
  const formRef = useRef<FormComponentRef>(null);

  const paginationSorting = usePaginationSorting<TSortField>({
    defaultPage,
    defaultLimit,
    defaultSortBy,
    defaultSortOrder,
  });

  const dialog = usePageDialog<_TItem>({
    onSuccessCallback: () => {
      onSuccess?.create?.();
      onSuccess?.update?.();
    },
  });

  const deleteHandler = usePageDelete<_TItem>({
    onDeleteSuccessCallback: () => {
      onSuccess?.delete?.();
    },
    onDeleteManySuccessCallback: () => {
      onSuccess?.deleteMany?.();
    },
  });

  const form = useZodForm({
    zod: filterSchema,
    defaultValues: defaultFilterValues,
  });

  const { data, isLoading, refetch } = useQueryHook(
    paginationSorting.queryParams,
    formRef,
    form.handleSubmit,
  );

  const createMutation = useCreateMutation();
  const updateMutation = useUpdateMutation();
  const deleteMutation = useDeleteMutation();
  const deleteManyMutation = useDeleteManyMutation?.();

  const handleSubmitForm = async (
    formData: TUpsertDto,
    saveAndAdd?: boolean,
  ) => {
    try {
      if (formData.id) {
        await updateMutation.mutateAsync(formData);
      } else {
        await createMutation.mutateAsync(formData as Omit<TUpsertDto, 'id'>);
      }
      if (saveAndAdd) {
        dialog.handleSaveAndAdd();
      } else {
        dialog.handleClose();
      }
    } catch {
      // Error is already handled by mutation's onError callback
    }
  };

  const handleConfirmDelete = async () => {
    await deleteHandler.handleConfirmDelete((ids: string[]) =>
      deleteMutation.mutateAsync(ids[0]),
    );
  };

  const handleConfirmDeleteMany = deleteManyMutation
    ? async () => {
        await deleteHandler.handleConfirmDeleteMany(
          deleteManyMutation.mutateAsync,
        );
      }
    : undefined;

  const handleSearch = () => {
    refetch();
  };

  const handleReset = () => {
    form.reset(defaultFilterValues);
  };

  const isSubmitting = useMemo(
    () =>
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      (deleteManyMutation?.isPending ?? false),
    [
      createMutation.isPending,
      updateMutation.isPending,
      deleteMutation.isPending,
      deleteManyMutation?.isPending,
    ],
  );

  return {
    formRef,
    form: {
      control: form.control,
      handleSubmit: form.handleSubmit,
      reset: handleReset,
    },
    paginationSorting: {
      page: paginationSorting.page,
      limit: paginationSorting.limit,
      sorting: paginationSorting.sorting,
      setPage: paginationSorting.setPage,
      setLimit: paginationSorting.setLimit,
      setSorting: (updater: any) =>
        paginationSorting.setSorting(updater, defaultSortBy),
    },
    dialog: {
      isDialogOpen: dialog.isDialogOpen,
      selectedItem: dialog.selectedItem,
      resetTrigger: dialog.resetTrigger,
      handleAdd: dialog.handleAdd,
      handleEdit: dialog.handleEdit,
      handleClose: dialog.handleClose,
      handleSaveAndAdd: dialog.handleSaveAndAdd,
    },
    delete: {
      isDeleteDialogOpen: deleteHandler.isDeleteDialogOpen,
      itemToDelete: deleteHandler.itemToDelete,
      handleDelete: deleteHandler.handleDelete,
      handleDeleteDialogClose: deleteHandler.handleDeleteDialogClose,
      handleConfirmDelete,
      isDeleteManyDialogOpen: deleteHandler.isDeleteManyDialogOpen,
      itemsToDeleteMany: deleteHandler.itemsToDeleteMany,
      selectedRecords: deleteHandler.selectedRecords,
      setSelectedRecords: deleteHandler.setSelectedRecords,
      handleDeleteMany: deleteHandler.handleDeleteMany,
      handleDeleteManyDialogClose: deleteHandler.handleDeleteManyDialogClose,
      handleConfirmDeleteMany,
    },
    query: {
      data,
      isLoading,
      refetch: handleSearch,
    },
    mutations: {
      create: createMutation,
      update: updateMutation,
      delete: deleteMutation,
      deleteMany: deleteManyMutation,
    },
    isSubmitting,
    handleSubmitForm,
  };
}
