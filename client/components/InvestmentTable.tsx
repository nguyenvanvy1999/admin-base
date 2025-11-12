import type { InvestmentFull } from '@client/types/investment';
import { ActionIcon, Badge } from '@mantine/core';
import {
  InvestmentAssetType,
  InvestmentMode,
} from '@server/generated/prisma/enums';
import { IconEdit, IconEye } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from './DataTable';

type InvestmentTableProps = {
  investments: InvestmentFull[];
  onEdit: (investment: InvestmentFull) => void;
  onView: (investment: InvestmentFull) => void;
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
    (): DataTableColumn<InvestmentFull>[] => [
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
      {
        accessor: 'assetType',
        title: 'investments.assetType',
        enableSorting: false,
        render: (value: unknown, row: InvestmentFull) => (
          <Badge color="blue" variant="light">
            {(() => {
              switch (row.assetType) {
                case InvestmentAssetType.coin:
                  return t('investments.asset.coin', { defaultValue: 'Coin' });
                case InvestmentAssetType.ccq:
                  return t('investments.asset.ccq', {
                    defaultValue: 'Mutual fund',
                  });
                case InvestmentAssetType.custom:
                default:
                  return t('investments.asset.custom', {
                    defaultValue: 'Custom',
                  });
              }
            })()}
          </Badge>
        ),
      },
      {
        accessor: 'mode',
        title: 'investments.mode',
        enableSorting: false,
        render: (value: unknown, row: InvestmentFull) => (
          <Badge
            color={row.mode === InvestmentMode.priced ? 'green' : 'yellow'}
          >
            {row.mode === InvestmentMode.priced
              ? t('investments.modes.priced', { defaultValue: 'Market priced' })
              : t('investments.modes.manual', {
                  defaultValue: 'Manual valuation',
                })}
          </Badge>
        ),
      },
      {
        accessor: (row) => row.currency?.code ?? '',
        title: 'investments.currency',
        enableSorting: false,
      },
      {
        accessor: 'createdAt',
        title: 'common.createdAt',
      },
      {
        accessor: 'updatedAt',
        title: 'common.updatedAt',
      },
      {
        title: 'investments.actions',
        textAlign: 'center',
        width: '8rem',
        render: (value: unknown, row: InvestmentFull) => (
          <div className="flex items-center justify-center gap-2">
            <ActionIcon
              variant="subtle"
              color="blue"
              onClick={(e) => {
                e.stopPropagation();
                onView(row);
              }}
            >
              <IconEye size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row);
              }}
            >
              <IconEdit size={16} />
            </ActionIcon>
          </div>
        ),
      },
    ],
    [t, onEdit, onView],
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
