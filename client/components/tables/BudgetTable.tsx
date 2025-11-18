import { Button, Group } from '@mantine/core';
import type { BudgetResponse } from '@server/dto/budget.dto';
import { BudgetPeriod } from '@server/generated';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  createBooleanColumn,
  createDateColumn,
  createTypeColumn,
} from './columnFactories';
import { renderActionButtons, renderCurrency } from './columnRenderers';
import { DataTable, type DataTableColumn } from './DataTable';
import { DeleteManyToolbar } from './deleteManyToolbar';

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
          return renderCurrency({
            value: amount,
            symbol: '$',
            decimalScale: 2,
          });
        },
      },
      createTypeColumn<BudgetResponse>({
        accessor: 'period',
        title: 'budgets.period',
        getType: (row) => row.period,
        labelMap: {
          [BudgetPeriod.daily]: t('budgets.periodOptions.daily', {
            defaultValue: 'Daily',
          }),
          [BudgetPeriod.monthly]: t('budgets.periodOptions.monthly', {
            defaultValue: 'Monthly',
          }),
          [BudgetPeriod.quarterly]: t('budgets.periodOptions.quarterly', {
            defaultValue: 'Quarterly',
          }),
          [BudgetPeriod.yearly]: t('budgets.periodOptions.yearly', {
            defaultValue: 'Yearly',
          }),
          [BudgetPeriod.none]: t('budgets.periodOptions.none', {
            defaultValue: 'None',
          }),
        },
        defaultColor: 'blue',
      }),
      createDateColumn<BudgetResponse>({
        accessor: 'startDate',
        title: 'budgets.startDate',
        getValue: (row) => row.startDate,
      }),
      createDateColumn<BudgetResponse>({
        accessor: 'endDate',
        title: 'budgets.endDate',
        getValue: (row) => row.endDate,
      }),
      createBooleanColumn<BudgetResponse>({
        accessor: 'carryOver',
        title: 'budgets.carryOver',
        getValue: (row) => row.carryOver || false,
        trueLabel: t('common.yes', { defaultValue: 'Yes' }),
        falseLabel: t('common.no', { defaultValue: 'No' }),
        trueColor: 'green',
        falseColor: 'gray',
      }),
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
            {renderActionButtons({ onEdit, onDelete }, row)}
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
        onDeleteMany && selectedRecords
          ? () => (
              <DeleteManyToolbar
                selectedRecords={selectedRecords}
                onDeleteMany={onDeleteMany}
                isLoading={isLoading}
              />
            )
          : undefined
      }
    />
  );
};

export default BudgetTable;
