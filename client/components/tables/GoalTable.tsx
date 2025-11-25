import type { GoalResponse } from '@server/dto/goal.dto';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  createActionColumn,
  createCurrencyColumn,
  createDateColumn,
  createLinkableColumn,
} from './columnFactories';
import { DataTable, type DataTableColumn } from './DataTable';
import { DeleteManyToolbar } from './deleteManyToolbar';

type GoalTableProps = {
  goals: GoalResponse[];
  onEdit: (goal: GoalResponse) => void;
  onDelete: (goal: GoalResponse) => void;
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
  selectedRecords?: GoalResponse[];
  onSelectedRecordsChange?: (records: GoalResponse[]) => void;
};

const GoalTable = ({
  goals,
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
}: GoalTableProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const columns = useMemo(
    (): DataTableColumn<GoalResponse>[] => [
      createLinkableColumn<GoalResponse, 'name'>({
        accessor: 'name',
        title: 'goals.name',
        onClick: (row, e) => {
          e?.stopPropagation();
          navigate(`/goals/${row.id}`);
        },
      }),
      createCurrencyColumn<GoalResponse, 'amount'>({
        accessor: 'amount',
        title: 'goals.amount',
        getSymbol: (row) => row.currency?.symbol || undefined,
        decimalScale: 2,
      }),
      createDateColumn<GoalResponse, 'startDate'>({
        accessor: 'startDate',
        title: 'goals.startDate',
        format: 'YYYY-MM-DD',
      }),
      createDateColumn<GoalResponse, 'endDate'>({
        accessor: 'endDate',
        title: 'goals.endDate',
        format: 'YYYY-MM-DD',
      }),
      createActionColumn<GoalResponse>({
        title: 'goals.actions',
        onEdit,
        onDelete,
        custom: [
          {
            label: t('goals.viewDetail', { defaultValue: 'View Detail' }),
            onClick: (row) => navigate(`/goals/${row.id}`),
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
      data={goals}
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

export default GoalTable;
