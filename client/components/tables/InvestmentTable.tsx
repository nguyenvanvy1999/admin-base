import type { InvestmentResponse } from '@server/dto/investment.dto';
import { InvestmentAssetType, InvestmentMode } from '@server/generated';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createActionColumn,
  createBadgeColumn,
  createTypeColumn,
} from './columnFactories';
import { DataTable, type DataTableColumn } from './DataTable';

type InvestmentTableProps = {
  investments: InvestmentResponse[];
  onEdit: (investment: InvestmentResponse) => void;
  onView: (investment: InvestmentResponse) => void;
  onDelete: (investment: InvestmentResponse) => void;
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
};

const InvestmentTable = ({
  investments,
  onEdit,
  onView,
  onDelete,
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
}: InvestmentTableProps) => {
  const { t } = useTranslation();

  const columns = useMemo(
    (): DataTableColumn<InvestmentResponse>[] => [
      {
        accessor: 'name',
        title: 'investments.name',
        onClick: onView,
      },
      {
        accessor: 'symbol',
        title: 'investments.symbol',
        enableSorting: false,
      },
      createTypeColumn<InvestmentResponse>({
        accessor: 'assetType',
        title: 'investments.assetType',
        enableSorting: false,
        getType: (row) => row.assetType,
        labelMap: {
          [InvestmentAssetType.coin]: t('investments.asset.coin', {
            defaultValue: 'Coin',
          }),
          [InvestmentAssetType.ccq]: t('investments.asset.ccq', {
            defaultValue: 'Mutual fund',
          }),
          [InvestmentAssetType.custom]: t('investments.asset.custom', {
            defaultValue: 'Custom',
          }),
        },
        defaultColor: 'blue',
      }),
      createBadgeColumn<InvestmentResponse>({
        accessor: 'mode',
        title: 'investments.mode',
        enableSorting: false,
        getLabel: (row) =>
          row.mode === InvestmentMode.priced
            ? t('investments.modes.priced', { defaultValue: 'Market priced' })
            : t('investments.modes.manual', {
                defaultValue: 'Manual valuation',
              }),
        getColor: (row) =>
          row.mode === InvestmentMode.priced ? 'green' : 'yellow',
      }),
      {
        accessor: (row) => row.currency?.code ?? '',
        title: 'investments.currency',
        enableSorting: false,
      },
      {
        accessor: 'created',
        title: 'common.created',
      },
      {
        accessor: 'modified',
        title: 'common.modified',
      },
      createActionColumn<InvestmentResponse>({
        title: 'investments.actions',
        onEdit,
        onDelete,
        onView,
      }),
    ],
    [t, onEdit, onView, onDelete],
  );

  return (
    <DataTable
      data={investments}
      columns={columns}
      loading={isLoading}
      showIndexColumn={showIndexColumn}
      recordsPerPage={recordsPerPage}
      recordsPerPageOptions={recordsPerPageOptions}
      onRecordsPerPageChange={onRecordsPerPageChange}
      page={page}
      onPageChange={onPageChange}
      totalRecords={totalRecords}
      sorting={sorting}
      onSortingChange={onSortingChange}
    />
  );
};

export default InvestmentTable;
