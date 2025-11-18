import AddEditRoleDialog from '@client/components/dialogs/AddEditRoleDialog';
import { DeleteConfirmationModal } from '@client/components/dialogs/DeleteConfirmationModal';
import { DeleteManyConfirmationModal } from '@client/components/dialogs/DeleteManyConfirmationModal';
import {
  FormComponent,
  type FormComponentRef,
} from '@client/components/FormComponent';
import { PageContainer } from '@client/components/PageContainer';
import RoleTable from '@client/components/tables/RoleTable';
import { ZodFormController } from '@client/components/ZodFormController';
import {
  useCreateRoleMutation,
  useDeleteManyRolesMutation,
  useUpdateRoleMutation,
} from '@client/hooks/mutations/useRoleMutations';
import {
  type FilterFormValue,
  useRolesQuery,
} from '@client/hooks/queries/useRoleQueries';
import { usePageDelete } from '@client/hooks/usePageDelete';
import { usePageDialog } from '@client/hooks/usePageDialog';
import { usePaginationSorting } from '@client/hooks/usePaginationSorting';
import { usePermission } from '@client/hooks/usePermission';
import { useZodForm } from '@client/hooks/useZodForm';
import NotFoundPage from '@client/pages/NotFoundPage';
import { Button, Group, TextInput } from '@mantine/core';
import type { RoleResponse } from '@server/dto/admin/role.dto';
import { ListRolesQueryDto } from '@server/dto/admin/role.dto';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

const filterSchema = ListRolesQueryDto.pick({
  search: true,
});

const defaultFilterValues: FilterFormValue = {
  search: '',
};

const RolePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formRef = useRef<FormComponentRef>(null);
  const { hasPermission } = usePermission();

  const canView = hasPermission('ROLE.VIEW');
  const canCreate = hasPermission('ROLE.CREATE');

  useEffect(() => {
    if (!canView) {
      navigate('/404');
    }
  }, [canView, navigate]);

  if (!canView) {
    return <NotFoundPage />;
  }

  const paginationSorting = usePaginationSorting<'title' | 'created'>({
    defaultPage: 1,
    defaultLimit: 20,
    defaultSortBy: 'created',
    defaultSortOrder: 'desc',
  });

  const dialog = usePageDialog<RoleResponse>();

  const deleteHandler = usePageDelete<RoleResponse>();

  const form = useZodForm({
    zod: filterSchema,
    defaultValues: defaultFilterValues,
  });

  const { data, isLoading, refetch } = useRolesQuery(
    paginationSorting.queryParams,
    formRef,
    form.handleSubmit,
  );

  const createMutation = useCreateRoleMutation();
  const updateMutation = useUpdateRoleMutation();
  const deleteManyMutation = useDeleteManyRolesMutation();

  const handleSubmitForm = async (formData: {
    id?: string;
    title: string;
    description?: string | null;
    enabled: boolean;
    permissionIds: string[];
    playerIds: string[];
  }) => {
    try {
      if (formData.id) {
        await updateMutation.mutateAsync(formData);
      } else {
        await createMutation.mutateAsync(formData);
      }
      dialog.handleClose();
    } catch {
      /* handled by mutation */
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteHandler.handleConfirmDeleteMany(
        deleteManyMutation.mutateAsync,
      );
    } catch {
      /* handled by mutation */
    }
  };

  const handleConfirmDeleteMany = async () => {
    if (
      deleteHandler.selectedRecords &&
      deleteHandler.selectedRecords.length > 0
    ) {
      try {
        await deleteManyMutation.mutateAsync(
          deleteHandler.selectedRecords.map((r) => r.id),
        );
        deleteHandler.setSelectedRecords([]);
        deleteHandler.handleDeleteManyDialogClose();
      } catch {
        // Error is already handled by mutation's onError callback
      }
    } else {
      deleteHandler.handleDeleteManyDialogClose();
    }
  };

  const handleSearch = () => {
    refetch();
  };

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteManyMutation.isPending;

  return (
    <PageContainer
      filterGroup={
        <FormComponent ref={formRef}>
          <Group>
            <ZodFormController
              control={form.control}
              name="search"
              render={({ field, fieldState: { error } }) => (
                <TextInput
                  placeholder={t('roles.search')}
                  error={error}
                  style={{ flex: 1, maxWidth: '300px' }}
                  {...field}
                />
              )}
            />
          </Group>
        </FormComponent>
      }
      buttonGroups={
        canCreate && (
          <Button onClick={dialog.handleAdd} disabled={isSubmitting}>
            {t('roles.addRole')}
          </Button>
        )
      }
      onSearch={handleSearch}
      onReset={() => {
        form.reset(defaultFilterValues);
        refetch();
      }}
    >
      <RoleTable
        roles={data?.roles || []}
        onEdit={dialog.handleEdit}
        onDelete={deleteHandler.handleDelete}
        onDeleteMany={(roles) => {
          deleteHandler.handleDeleteMany(roles.map((r) => r.id));
        }}
        isLoading={isLoading}
        recordsPerPage={paginationSorting.limit}
        recordsPerPageOptions={[10, 20, 50, 100]}
        onRecordsPerPageChange={paginationSorting.setLimit}
        page={paginationSorting.page}
        onPageChange={paginationSorting.setPage}
        totalRecords={data?.pagination?.total}
        sorting={paginationSorting.sorting}
        onSortingChange={(updater) =>
          paginationSorting.setSorting(updater, 'created')
        }
        selectedRecords={deleteHandler.selectedRecords}
        onSelectedRecordsChange={deleteHandler.setSelectedRecords}
      />

      {dialog.isDialogOpen && (
        <AddEditRoleDialog
          isOpen={dialog.isDialogOpen}
          onClose={dialog.handleClose}
          role={dialog.selectedItem}
          onSubmit={handleSubmitForm}
          isLoading={isSubmitting}
          resetTrigger={dialog.resetTrigger}
        />
      )}

      {deleteHandler.isDeleteDialogOpen && deleteHandler.itemToDelete && (
        <DeleteConfirmationModal
          isOpen={deleteHandler.isDeleteDialogOpen}
          onClose={deleteHandler.handleDeleteDialogClose}
          onConfirm={handleConfirmDelete}
          isLoading={isSubmitting}
          title={t('roles.deleteConfirmTitle')}
          message={t('roles.deleteConfirmMessage')}
          itemName={deleteHandler.itemToDelete.title}
        />
      )}

      {deleteHandler.isDeleteManyDialogOpen &&
        deleteHandler.selectedRecords &&
        deleteHandler.selectedRecords.length > 0 && (
          <DeleteManyConfirmationModal
            isOpen={deleteHandler.isDeleteManyDialogOpen}
            onClose={deleteHandler.handleDeleteManyDialogClose}
            onConfirm={handleConfirmDeleteMany}
            isLoading={isSubmitting}
            title={t('roles.deleteManyConfirmTitle')}
            message={t('roles.deleteManyConfirmMessage')}
            count={deleteHandler.selectedRecords.length}
          />
        )}
    </PageContainer>
  );
};

export default RolePage;
