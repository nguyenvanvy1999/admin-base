import AddEditUserDialog from '@client/components/dialogs/AddEditUserDialog';
import { DeleteConfirmationModal } from '@client/components/dialogs/DeleteConfirmationModal';
import {
  FormComponent,
  type FormComponentRef,
} from '@client/components/FormComponent';
import { PageContainer } from '@client/components/PageContainer';
import UserTable from '@client/components/tables/UserTable';
import { ZodFormController } from '@client/components/ZodFormController';
import {
  useCreateUserMutation,
  useDeleteManyUsersMutation,
  useUpdateUserMutation,
} from '@client/hooks/mutations/useUserMutations';
import {
  type FilterFormValue,
  useUsersQuery,
} from '@client/hooks/queries/useUserQueries';
import { useUserQuery } from '@client/hooks/queries/useUserQuery';
import { usePageDelete } from '@client/hooks/usePageDelete';
import { usePageDialog } from '@client/hooks/usePageDialog';
import { usePaginationSorting } from '@client/hooks/usePaginationSorting';
import { usePermission } from '@client/hooks/usePermission';
import { useZodForm } from '@client/hooks/useZodForm';
import NotFoundPage from '@client/pages/NotFoundPage';
import { Button, Group, TextInput } from '@mantine/core';
import type { IUpsertUserDto, UserResponse } from '@server/dto/admin/user.dto';
import { ListUsersQueryDto } from '@server/dto/admin/user.dto';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

const filterSchema = ListUsersQueryDto.pick({
  search: true,
});

const defaultFilterValues: FilterFormValue = {
  search: '',
};

const UserPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formRef = useRef<FormComponentRef>(null);
  const { hasPermission } = usePermission();
  const { isPending: isUserLoading } = useUserQuery();

  const canView = hasPermission('USER.VIEW') || hasPermission('USER.VIEW_ALL');
  const canUpdate = hasPermission('USER.UPDATE');

  const paginationSorting = usePaginationSorting<
    'username' | 'name' | 'role' | 'created'
  >({
    defaultPage: 1,
    defaultLimit: 20,
    defaultSortBy: 'created',
    defaultSortOrder: 'desc',
  });

  const dialog = usePageDialog<UserResponse>();

  const deleteHandler = usePageDelete<UserResponse>();

  const form = useZodForm({
    zod: filterSchema,
    defaultValues: defaultFilterValues,
  });

  const { data, isLoading, refetch } = useUsersQuery(
    paginationSorting.queryParams,
    formRef,
    form.handleSubmit,
    {
      enabled: !isUserLoading && canView,
    },
  );

  useEffect(() => {
    if (!isUserLoading && !canView) {
      navigate('/404');
    }
  }, [canView, isUserLoading, navigate]);

  if (isUserLoading) {
    return null;
  }

  if (!canView) {
    return <NotFoundPage />;
  }

  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const deleteManyMutation = useDeleteManyUsersMutation();

  const handleSubmitForm = async (formData: IUpsertUserDto) => {
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
    await deleteHandler.handleConfirmDeleteMany(deleteManyMutation.mutateAsync);
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
                  placeholder={t('users.search')}
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
        canUpdate && (
          <Button onClick={dialog.handleAdd} disabled={isSubmitting}>
            {t('users.addUser')}
          </Button>
        )
      }
      onSearch={handleSearch}
      onReset={() => {
        form.reset(defaultFilterValues);
        refetch();
      }}
    >
      <UserTable
        users={data?.users || []}
        onEdit={dialog.handleEdit}
        onDelete={deleteHandler.handleDelete}
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
      />

      {dialog.isDialogOpen && (
        <AddEditUserDialog
          isOpen={dialog.isDialogOpen}
          onClose={dialog.handleClose}
          user={dialog.selectedItem}
          onSubmit={handleSubmitForm}
          isLoading={isSubmitting}
        />
      )}

      {deleteHandler.isDeleteDialogOpen && deleteHandler.itemToDelete && (
        <DeleteConfirmationModal
          isOpen={deleteHandler.isDeleteDialogOpen}
          onClose={deleteHandler.handleDeleteDialogClose}
          onConfirm={handleConfirmDelete}
          isLoading={isSubmitting}
          title={t('users.deleteConfirmTitle')}
          message={t('users.deleteConfirmMessage')}
          itemName={deleteHandler.itemToDelete.username}
        />
      )}
    </PageContainer>
  );
};

export default UserPage;
