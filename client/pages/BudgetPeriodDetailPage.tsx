import BudgetPeriodDetail from '@client/components/BudgetPeriodDetail';
import { DeleteConfirmationModal } from '@client/components/DeleteConfirmationModal';
import TransactionTable from '@client/components/TransactionTable';
import { useDeleteTransactionMutation } from '@client/hooks/mutations/useTransactionMutations';
import {
  useBudgetPeriodDetailQuery,
  useBudgetQuery,
} from '@client/hooks/queries/useBudgetQueries';
import { usePaginationSorting } from '@client/hooks/usePaginationSorting';
import { transactionService } from '@client/services';
import {
  Button,
  Card,
  Center,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import type { TransactionDetail } from '@server/dto/transaction.dto';
import { TransactionType } from '@server/generated';
import { IconArrowLeft } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

const BudgetPeriodDetailPage = () => {
  const { budgetId, periodId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [transactionToDelete, setTransactionToDelete] =
    useState<TransactionDetail | null>(null);

  if (!budgetId || !periodId) {
    return (
      <Center h="100vh">
        <Text c="red">
          {t('budgets.invalidId', {
            defaultValue: 'Budget or period identifier is missing.',
          })}
        </Text>
      </Center>
    );
  }

  const { data: budget, isLoading: isBudgetLoading } = useBudgetQuery(budgetId);
  const { data: periodDetail, isLoading: isPeriodLoading } =
    useBudgetPeriodDetailQuery(budgetId, periodId);

  const paginationSorting = usePaginationSorting<
    'date' | 'amount' | 'type' | 'accountId'
  >({
    defaultPage: 1,
    defaultLimit: 20,
    defaultSortBy: 'date',
    defaultSortOrder: 'desc',
  });

  const { data: transactionsData, isLoading: isTransactionsLoading } = useQuery(
    {
      queryKey: [
        'budget-period-transactions',
        budgetId,
        periodId,
        paginationSorting.queryParams,
        periodDetail,
      ],
      queryFn: () => {
        if (!periodDetail || !budget) return null;

        return transactionService.listTransactions({
          types: [TransactionType.expense],
          accountIds: budget.accountIds,
          categoryIds: budget.categoryIds,
          dateFrom: periodDetail.periodStartDate,
          dateTo: periodDetail.periodEndDate,
          page: paginationSorting.page,
          limit: paginationSorting.limit,
          sortBy: paginationSorting.sortBy,
          sortOrder: paginationSorting.sortOrder,
        });
      },
      enabled: !!periodDetail && !!budget,
    },
  );

  const deleteMutation = useDeleteTransactionMutation();

  const handleDeleteTransaction = (transaction: TransactionDetail) => {
    setTransactionToDelete(transaction);
  };

  const handleConfirmDelete = async () => {
    if (transactionToDelete) {
      try {
        await deleteMutation.mutateAsync(transactionToDelete.id);
        setTransactionToDelete(null);
      } catch {
        // Error is already handled by mutation's onError callback
      }
    }
  };

  const isLoading = isBudgetLoading || isPeriodLoading || isTransactionsLoading;

  return (
    <Container fluid py="md">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Group gap="md">
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={18} />}
              onClick={() => navigate(`/budgets/${budgetId}`)}
            >
              {t('common.back', { defaultValue: 'Back' })}
            </Button>
            <Stack gap="xs">
              <Title order={2}>
                {budget?.name
                  ? `${budget.name} - ${t('budgets.periodDetail', {
                      defaultValue: 'Period Detail',
                    })}`
                  : t('budgets.periodDetail', {
                      defaultValue: 'Period Detail',
                    })}
              </Title>
              {periodDetail && (
                <Text size="sm" c="dimmed">
                  {new Date(periodDetail.periodStartDate).toLocaleDateString()}{' '}
                  - {new Date(periodDetail.periodEndDate).toLocaleDateString()}
                </Text>
              )}
            </Stack>
          </Group>
        </Group>

        {isLoading ? (
          <Center py="xl">
            <Text c="dimmed">
              {t('common.loading', { defaultValue: 'Loading...' })}
            </Text>
          </Center>
        ) : periodDetail ? (
          <>
            <Card shadow="sm" padding="lg" withBorder>
              <BudgetPeriodDetail period={periodDetail} />
            </Card>

            <Card shadow="sm" padding="lg" withBorder>
              <Title order={4} mb="md">
                {t('budgets.periodTransactions', {
                  defaultValue: 'Period Transactions',
                })}
              </Title>
              <TransactionTable
                transactions={transactionsData?.transactions || []}
                onEdit={() => {
                  // Edit functionality can be added later if needed
                }}
                onDelete={handleDeleteTransaction}
                isLoading={isTransactionsLoading}
                recordsPerPage={paginationSorting.limit}
                recordsPerPageOptions={[10, 20, 50, 100]}
                onRecordsPerPageChange={paginationSorting.setLimit}
                page={paginationSorting.page}
                onPageChange={paginationSorting.setPage}
                totalRecords={transactionsData?.pagination?.total}
                sorting={paginationSorting.sorting}
                onSortingChange={(updater) =>
                  paginationSorting.setSorting(updater, 'date')
                }
              />
            </Card>
          </>
        ) : (
          <Center py="xl">
            <Text c="red">
              {t('budgets.periodNotFound', {
                defaultValue: 'Period not found',
              })}
            </Text>
          </Center>
        )}
      </Stack>

      {transactionToDelete && (
        <DeleteConfirmationModal
          isOpen={!!transactionToDelete}
          onClose={() => setTransactionToDelete(null)}
          onConfirm={handleConfirmDelete}
          isLoading={deleteMutation.isPending}
          title={t('transactions.deleteConfirmTitle', {
            defaultValue: 'Delete Transaction',
          })}
          message={t('transactions.deleteConfirmMessage', {
            defaultValue: 'Are you sure you want to delete this transaction?',
          })}
          itemName={transactionToDelete.note || transactionToDelete.id}
        />
      )}
    </Container>
  );
};

export default BudgetPeriodDetailPage;
