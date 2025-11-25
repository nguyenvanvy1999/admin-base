import type { BudgetResponse } from '@server/dto/budget.dto';
import { BudgetPeriod } from '@server/generated';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  createActionColumn,
  createBooleanColumn,
  createCurrencyColumn,
  createDateColumn,
  createLinkableColumn,
  createTypeColumn,
} from './columnFactories';
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
      createLinkableColumn<BudgetResponse, 'name'>({
        accessor: 'name',
        title: 'budgets.name',
        onClick: (row, e) => {
          e?.stopPropagation();
          navigate(`/budgets/${row.id}`);
        },
      }),
      createCurrencyColumn<BudgetResponse, 'amount'>({
        accessor: 'amount',
        title: 'budgets.amount',
        getSymbol: () => '$',
        decimalScale: 2,
      }),
      createTypeColumn<BudgetResponse, 'period'>({
        accessor: 'period',
        title: 'budgets.period',
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
      createDateColumn<BudgetResponse, 'startDate'>({
        accessor: 'startDate',
        title: 'budgets.startDate',
        format: 'YYYY-MM-DD',
      }),
      createDateColumn<BudgetResponse, 'endDate'>({
        accessor: 'endDate',
        title: 'budgets.endDate',
        format: 'YYYY-MM-DD',
      }),
      createBooleanColumn<BudgetResponse, 'carryOver'>({
        accessor: 'carryOver',
        title: 'budgets.carryOver',
        trueLabel: t('common.yes', { defaultValue: 'Yes' }),
        falseLabel: t('common.no', { defaultValue: 'No' }),
        trueColor: 'green',
        falseColor: 'gray',
      }),
      createActionColumn<BudgetResponse>({
        title: 'budgets.actions',
        onEdit,
        onDelete,
        custom: [
          {
            label: t('budgets.viewPeriods', { defaultValue: 'View Periods' }),
            onClick: (row) => navigate(`/budgets/${row.id}`),
            variant: 'light',
          },
        ],
      }),
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
