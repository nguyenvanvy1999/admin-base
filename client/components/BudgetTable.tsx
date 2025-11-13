import { ActionIcon, Badge, Button } from '@mantine/core';
import type { BudgetResponse } from '@server/dto/budget.dto';
import { BudgetPeriod } from '@server/generated/prisma/enums';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from './DataTable';

type BudgetTableProps = {
  budgets: BudgetResponse[];
  onEdit: (budget: BudgetResponse) => void;
  onDelete: (budget: BudgetResponse) => void;
  onDeleteMany?: (ids: string[]) => void;
  onViewPeriods?: (budget: BudgetResponse) => void;
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
  onViewPeriods,
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

  const getPeriodLabel = (period: BudgetPeriod) => {
    switch (period) {
      case BudgetPeriod.daily:
        return t('budgets.period.daily', { defaultValue: 'Daily' });
      case BudgetPeriod.monthly:
        return t('budgets.period.monthly', { defaultValue: 'Monthly' });
      case BudgetPeriod.quarterly:
        return t('budgets.period.quarterly', { defaultValue: 'Quarterly' });
      case BudgetPeriod.yearly:
        return t('budgets.period.yearly', { defaultValue: 'Yearly' });
      case BudgetPeriod.none:
        return t('budgets.period.none', { defaultValue: 'None' });
      default:
        return period;
    }
  };

  const columns = useMemo(
    (): DataTableColumn<BudgetResponse>[] => [
      {
        accessor: 'name',
        title: 'budgets.name',
      },
      {
        accessor: 'amount',
        title: 'budgets.amount',
        render: (value: unknown) => {
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
        render: (value: unknown) => {
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
        render: (value: unknown) => {
          if (!value) return <span className="text-gray-400">-</span>;
          return new Date(value as string).toLocaleDateString();
        },
      },
      {
        accessor: 'endDate',
        title: 'budgets.endDate',
        render: (value: unknown) => {
          if (!value) return <span className="text-gray-400">-</span>;
          return new Date(value as string).toLocaleDateString();
        },
      },
      {
        accessor: 'carryOver',
        title: 'budgets.carryOver',
        render: (value: unknown) => {
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
        render: (_value: unknown, row: BudgetResponse) => (
          <div className="flex items-center gap-2">
            {onViewPeriods && (
              <Button
                size="xs"
                variant="light"
                onClick={() => onViewPeriods(row)}
              >
                {t('budgets.viewPeriods', { defaultValue: 'View Periods' })}
              </Button>
            )}
            <ActionIcon
              variant="subtle"
              color="blue"
              onClick={() => onEdit(row)}
            >
              <IconEdit size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => onDelete(row)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </div>
        ),
      },
    ],
    [t, onEdit, onDelete, onViewPeriods],
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
      onDeleteMany={onDeleteMany}
    />
  );
};

export default BudgetTable;
