import { DeleteConfirmationModal } from '@client/components/dialogs/DeleteConfirmationModal';
import {
  FormComponent,
  type FormComponentRef,
} from '@client/components/FormComponent';
import { PageContainer } from '@client/components/PageContainer';
import SessionTable from '@client/components/tables/SessionTable';
import { ZodFormController } from '@client/components/ZodFormController';
import {
  useRevokeManySessionsMutation,
  useRevokeSessionMutation,
} from '@client/hooks/mutations/useSessionMutations';
import {
  type FilterFormValue,
  useSessionsQuery,
} from '@client/hooks/queries/useSessionQueries';
import { useUsersQuery } from '@client/hooks/queries/useUserQueries';
import { usePageDelete } from '@client/hooks/usePageDelete';
import { usePaginationSorting } from '@client/hooks/usePaginationSorting';
import { usePermission } from '@client/hooks/usePermission';
import { useZodForm } from '@client/hooks/useZodForm';
import NotFoundPage from '@client/pages/NotFoundPage';
import { Group, Select as MantineSelect } from '@mantine/core';
import type { SessionResponseWithUser } from '@server/dto/admin/session.dto';
import type { UserResponse } from '@server/dto/admin/user.dto';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { z } from 'zod';

const filterSchema = z.object({
  userId: z.string().optional(),
  revoked: z.enum(['all', 'active', 'revoked']).optional(),
});

const defaultFilterValues: FilterFormValue = {
  userId: undefined,
  revoked: 'all',
};

interface SessionPageProps {
  isAdminPage?: boolean;
}

const SessionPage = ({ isAdminPage = false }: SessionPageProps = {}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formRef = useRef<FormComponentRef>(null);
  const { hasPermission } = usePermission();

  const canView =
    hasPermission('SESSION.VIEW') || hasPermission('SESSION.VIEW_ALL');
  const canRevoke =
    hasPermission('SESSION.REVOKE') || hasPermission('SESSION.REVOKE_ALL');
  const isAdmin = hasPermission('SESSION.VIEW_ALL');
  const showAdminFeatures = isAdminPage && isAdmin;

  useEffect(() => {
    if (!canView) {
      navigate('/404');
    }
  }, [canView, navigate]);

  if (!canView) {
    return <NotFoundPage />;
  }

  const paginationSorting = usePaginationSorting<
    'created' | 'expired' | 'revoked'
  >({
    defaultPage: 1,
    defaultLimit: 20,
    defaultSortBy: 'created',
    defaultSortOrder: 'desc',
  });

  const deleteHandler = usePageDelete<SessionResponseWithUser>();

  const form = useZodForm({
    zod: filterSchema,
    defaultValues: defaultFilterValues,
  });

  const { data, isLoading, refetch } = useSessionsQuery(
    paginationSorting.queryParams,
    formRef,
    form.handleSubmit,
  );

  const { data: usersData } = useUsersQuery(
    { page: 1, limit: 1000 },
    { current: null },
    () => () => Promise.resolve(),
    { enabled: showAdminFeatures },
  );

  const userOptions = useMemo(() => {
    if (!usersData?.users || !showAdminFeatures) return [];
    return usersData.users.map((user: UserResponse) => ({
      value: user.id,
      label: user.username + (user.name ? ` (${user.name})` : ''),
    }));
  }, [usersData, showAdminFeatures]);

  const revokeMutation = useRevokeSessionMutation();
  const revokeManyMutation = useRevokeManySessionsMutation();

  const handleRevoke = (session: SessionResponseWithUser) => {
    deleteHandler.handleDelete(session);
  };

  const handleConfirmRevoke = async () => {
    if (!deleteHandler.itemToDelete) return;

    const userId =
      showAdminFeatures && deleteHandler.itemToDelete.userId
        ? deleteHandler.itemToDelete.userId
        : undefined;

    await revokeMutation.mutateAsync({
      sessionId: deleteHandler.itemToDelete.id,
      userId,
    });
    deleteHandler.handleDeleteDialogClose();
  };

  const handleRevokeMany = async (sessionIds: string[]) => {
    await revokeManyMutation.mutateAsync({
      sessionIds,
    });
  };

  const handleSearch = () => {
    refetch();
  };

  const isSubmitting = revokeMutation.isPending || revokeManyMutation.isPending;

  return (
    <PageContainer
      filterGroup={
        <FormComponent ref={formRef}>
          <Group>
            {showAdminFeatures && (
              <ZodFormController
                control={form.control}
                name="userId"
                render={({ field, fieldState: { error } }) => (
                  <MantineSelect
                    placeholder={t('sessions.filterByUser', {
                      defaultValue: 'Filter by User',
                    })}
                    error={error}
                    data={userOptions}
                    value={field.value || null}
                    onChange={(value) => field.onChange(value || undefined)}
                    clearable
                    searchable
                    w={{ base: '100%', sm: 300 }}
                  />
                )}
              />
            )}
            <ZodFormController
              control={form.control}
              name="revoked"
              render={({ field, fieldState: { error } }) => (
                <MantineSelect
                  placeholder={t('sessions.filterByStatus', {
                    defaultValue: 'Filter by Status',
                  })}
                  error={error}
                  data={[
                    {
                      value: 'all',
                      label: t('sessions.status.all', { defaultValue: 'All' }),
                    },
                    {
                      value: 'active',
                      label: t('sessions.status.active', {
                        defaultValue: 'Active',
                      }),
                    },
                    {
                      value: 'revoked',
                      label: t('sessions.status.revoked', {
                        defaultValue: 'Revoked',
                      }),
                    },
                  ]}
                  value={field.value || 'all'}
                  onChange={(value) =>
                    field.onChange(
                      (value as 'all' | 'active' | 'revoked') || 'all',
                    )
                  }
                  w={{ base: '100%', sm: 200 }}
                />
              )}
            />
          </Group>
        </FormComponent>
      }
      onSearch={handleSearch}
      onReset={() => {
        form.reset(defaultFilterValues);
        refetch();
      }}
    >
      <SessionTable
        sessions={data?.sessions || []}
        onRevoke={handleRevoke}
        onRevokeMany={canRevoke ? handleRevokeMany : undefined}
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
        showUserColumn={showAdminFeatures}
      />

      {deleteHandler.isDeleteDialogOpen && deleteHandler.itemToDelete && (
        <DeleteConfirmationModal
          isOpen={deleteHandler.isDeleteDialogOpen}
          onClose={deleteHandler.handleDeleteDialogClose}
          onConfirm={handleConfirmRevoke}
          isLoading={isSubmitting}
          title={t('sessions.revokeConfirmTitle', {
            defaultValue: 'Revoke Session',
          })}
          message={t('sessions.revokeConfirmMessage', {
            defaultValue: 'Are you sure you want to revoke this session?',
          })}
          itemName={deleteHandler.itemToDelete.id}
        />
      )}
    </PageContainer>
  );
};

export default SessionPage;
