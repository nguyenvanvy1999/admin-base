import { ActionIcon, Badge, Button, Group, Text } from '@mantine/core';
import type { BudgetResponse } from '@server/dto/budget.dto';
import { BudgetPeriod } from '@server/generated/browser-index';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { DataTable, type DataTableColumn } from './DataTable';

type BudgetTableProps = {
  budgets: BudgetResponse[];
  onEdit: (budget: BudgetResponse) => void;
  onDelete: (budget: BudgetResponse) => void;
  onDeleteMany?: (ids: string[]) => void;
  isLoading?: boolean;
  showIndexColumn?: boolean;
  recordsPerPage?: number;
  recordsPerPageOptions?: number[];
  onRecordsPerPageChange?: (size: number) => void;
  page?: number;
  onPageChange?: (page: number) => void;
  totalRecords?: number;
  sorting?: { id: string; desc: boolean }[];
  onSortingChange?: (
    updater:
      | { id: string; desc: boolean }[]
      | ((prev: { id: string; desc: boolean }[]) => {
          id: string;
          desc: boolean;
        }[]),
  ) => void;
  selectedRecords?: BudgetResponse[];
  onSelectedRecordsChange?: (records: BudgetResponse[]) => void;
};

const BudgetTable = ({
  budgets,
  onEdit,
  onDelete,
  onDeleteMany,
  isLoading = false,
  showIndexColumn = true,
  recordsPerPage,
  recordsPerPageOptions,
  onRecordsPerPageChange,
  page,
  onPageChange,
  totalRecords,
  sorting,
  onSortingChange,
  selectedRecords,
  onSelectedRecordsChange,
}: BudgetTableProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getPeriodLabel = (period: BudgetPeriod) => {
    switch (period) {
      case BudgetPeriod.daily:
        return t('budgets.periodOptions.daily', { defaultValue: 'Daily' });
      case BudgetPeriod.monthly:
        return t('budgets.periodOptions.monthly', { defaultValue: 'Monthly' });
      case BudgetPeriod.quarterly:
        return t('budgets.periodOptions.quarterly', {
          defaultValue: 'Quarterly',
        });
      case BudgetPeriod.yearly:
        return t('budgets.periodOptions.yearly', { defaultValue: 'Yearly' });
      case BudgetPeriod.none:
        return t('budgets.periodOptions.none', { defaultValue: 'None' });
      default:
        return period;
    }
  };

  const columns = useMemo(
    (): DataTableColumn<BudgetResponse>[] => [
      {
        accessor: 'name',
        title: 'budgets.name',
        render: (value, row: BudgetResponse) => (
          <Button
            variant="subtle"
            p={0}
            h="auto"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/budgets/${row.id}`);
            }}
            style={{ fontWeight: 'inherit' }}
          >
            {value as string}
          </Button>
        ),
      },
      {
        accessor: 'amount',
        title: 'budgets.amount',
        render: (value) => {
          const amount = typeof value === 'string' ? parseFloat(value) : 0;
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
          }).format(amount);
        },
      },
      {
        accessor: 'period',
        title: 'budgets.period',
        render: (value) => {
          const period = value as BudgetPeriod;
          return (
            <Badge variant="light" color="blue">
              {getPeriodLabel(period)}
            </Badge>
          );
        },
      },
      {
        accessor: 'startDate',
        title: 'budgets.startDate',
        render: (value) => {
          if (!value) return <Text c="dimmed">-</Text>;
          return new Date(value as string).toLocaleDateString();
        },
      },
      {
        accessor: 'endDate',
        title: 'budgets.endDate',
        render: (value) => {
          if (!value) return <Text c="dimmed">-</Text>;
          return new Date(value as string).toLocaleDateString();
        },
      },
      {
        accessor: 'carryOver',
        title: 'budgets.carryOver',
        render: (value) => {
          const carryOver = value as boolean;
          return carryOver ? (
            <Badge variant="light" color="green">
              {t('common.yes', { defaultValue: 'Yes' })}
            </Badge>
          ) : (
            <Badge variant="light" color="gray">
              {t('common.no', { defaultValue: 'No' })}
            </Badge>
          );
        },
      },
      {
        title: 'budgets.actions',
        accessor: 'actions',
        render: (_value, row: BudgetResponse) => (
          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/budgets/${row.id}`);
              }}
            >
              {t('budgets.viewPeriods', { defaultValue: 'View Periods' })}
            </Button>
            <ActionIcon
              variant="subtle"
              color="blue"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row);
              }}
            >
              <IconEdit size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row);
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ),
      },
    ],
    [t, onEdit, onDelete, navigate],
  );

  return (
    <DataTable
      columns={columns}
      data={budgets}
      isLoading={isLoading}
      showIndexColumn={showIndexColumn}
      recordsPerPage={recordsPerPage}
      recordsPerPageOptions={recordsPerPageOptions}
      onRecordsPerPageChange={onRecordsPerPageChange}
      page={page}
      onPageChange={onPageChange}
      totalRecords={totalRecords}
      sorting={sorting}
      onSortingChange={onSortingChange}
      selectedRecords={selectedRecords}
      onSelectedRecordsChange={onSelectedRecordsChange}
      renderTopToolbarCustomActions={
        onDeleteMany && selectedRecords && selectedRecords.length > 0
          ? () => (
              <Button
                color="red"
                variant="filled"
                leftSection={<IconTrash size={16} />}
                onClick={() => {
                  const selectedIds = selectedRecords?.map((r) => r.id) || [];
                  if (selectedIds.length > 0 && onDeleteMany) {
                    onDeleteMany(selectedIds);
                  }
                }}
                disabled={isLoading}
              >
                {t('common.deleteSelected', {
                  defaultValue: `Delete ${selectedRecords.length}`,
                  count: selectedRecords.length,
                })}
              </Button>
            )
          : undefined
      }
    />
  );
};

export default BudgetTable;
