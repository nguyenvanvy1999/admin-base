import type { InvestmentFull } from '@client/types/investment';
import { Badge } from '@mantine/core';
import {
  InvestmentAssetType,
  InvestmentMode,
} from '@server/generated/prisma/enums';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DataTable, {
  type DataTableColumn,
  type DataTableProps,
} from './DataTable';

type InvestmentTableProps = {
  investments: InvestmentFull[];
  onEdit: (investment: InvestmentFull) => void;
  onView: (investment: InvestmentFull) => void;
  isLoading?: boolean;
} & Pick<
  DataTableProps<InvestmentFull>,
  'search' | 'pageSize' | 'filters' | 'pagination' | 'sorting' | 'summary'
>;

const InvestmentTable = ({
  investments,
  onEdit,
  onView,
  isLoading = false,
  search,
  pageSize,
  filters,
  pagination,
  sorting,
  summary,
}: InvestmentTableProps) => {
  const { t } = useTranslation();

  const columns = useMemo(
    (): DataTableColumn<InvestmentFull>[] => [
      {
        accessor: 'name',
        title: 'investments.name',
        enableSorting: true,
      },
      {
        accessor: 'symbol',
        title: 'investments.symbol',
        enableSorting: true,
      },
      {
        accessor: 'assetType',
        title: 'investments.assetType',
        render: (value: InvestmentAssetType) => (
          <Badge color="blue" variant="light">
            {(() => {
              switch (value) {
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
        render: (value: InvestmentMode) => (
          <Badge color={value === InvestmentMode.priced ? 'green' : 'yellow'}>
            {value === InvestmentMode.priced
              ? t('investments.mode.priced', { defaultValue: 'Market priced' })
              : t('investments.mode.manual', {
                  defaultValue: 'Manual valuation',
                })}
          </Badge>
        ),
      },
      {
        accessor: 'currency.code',
        title: 'investments.currency',
      },
      {
        accessor: 'updatedAt',
        title: 'investments.updatedAt',
        format: 'date',
      },
    ],
    [t],
  );

  return (
    <DataTable
      data={investments}
      columns={columns}
      isLoading={isLoading}
      actions={{
        onEdit,
        headerLabel: t('investments.actions', { defaultValue: 'Actions' }),
        custom: [
          {
            label: t('investments.viewDetail', { defaultValue: 'View' }),
            onClick: onView,
          },
        ],
      }}
      onRowClick={onView}
      emptyMessage={t('investments.empty', {
        defaultValue: 'No investments yet',
      })}
      search={search}
      pageSize={pageSize}
      filters={filters}
      pagination={pagination}
      sorting={sorting}
      summary={summary}
    />
  );
};

export default InvestmentTable;
