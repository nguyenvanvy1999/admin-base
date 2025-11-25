import type { InvestmentResponse } from '@server/dto/investment.dto';
import { InvestmentAssetType, InvestmentMode } from '@server/generated';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createActionColumn,
  createBadgeColumn,
  createDateColumn,
  createTextColumn,
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
      createTextColumn<InvestmentResponse, 'name'>({
        accessor: 'name',
        title: 'investments.name',
        onClick: onView,
      }),
      createTextColumn<InvestmentResponse, 'symbol'>({
        accessor: 'symbol',
        title: 'investments.symbol',
        enableSorting: false,
      }),
      createTypeColumn<InvestmentResponse, 'assetType'>({
        accessor: 'assetType',
        title: 'investments.assetType',
        enableSorting: false,
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
      createBadgeColumn<InvestmentResponse, 'mode'>({
        accessor: 'mode',
        title: 'investments.mode',
        enableSorting: false,
        getLabel: (value) =>
          value === InvestmentMode.priced
            ? t('investments.modes.priced', { defaultValue: 'Market priced' })
            : t('investments.modes.manual', {
                defaultValue: 'Manual valuation',
              }),
        getColor: (value) =>
          value === InvestmentMode.priced ? 'green' : 'yellow',
      }),
      {
        accessor: (row: InvestmentResponse) => row.currency?.code ?? '',
        title: 'investments.currency',
        enableSorting: false,
      },
      createDateColumn<InvestmentResponse, 'created'>({
        accessor: 'created',
        title: 'common.created',
        format: 'YYYY-MM-DD HH:mm',
      }),
      createDateColumn<InvestmentResponse, 'modified'>({
        accessor: 'modified',
        title: 'common.modified',
        format: 'YYYY-MM-DD HH:mm',
      }),
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
