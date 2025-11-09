import type { EntityFull } from '@client/types/entity';
import { EntityType } from '@server/generated/prisma/enums';
import type { ColumnDef } from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DataTable, { type DataTableProps } from './DataTable';

type EntityTableProps = {
  entities: EntityFull[];
  onEdit: (entity: EntityFull) => void;
  onDelete: (entity: EntityFull) => void;
  isLoading?: boolean;
} & Pick<
  DataTableProps<EntityFull>,
  'search' | 'pageSize' | 'filters' | 'pagination' | 'sorting'
>;

const columnHelper = createColumnHelper<EntityFull>();

const EntityTable = ({
  entities,
  onEdit,
  onDelete,
  isLoading = false,
  search,
  pageSize,
  filters,
  pagination,
  sorting,
}: EntityTableProps) => {
  const { t } = useTranslation();

  const columns = useMemo(
    () =>
      [
        columnHelper.accessor('name', {
          header: t('entities.name'),
          enableSorting: true,
          cell: (info) => (
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {info.getValue()}
            </div>
          ),
        }),
        columnHelper.accessor('type', {
          header: t('entities.type'),
          enableSorting: true,
          cell: (info) => {
            const value = info.getValue();
            if (!value) return <span className="text-gray-400">-</span>;
            const label =
              value === EntityType.individual
                ? t('entities.individual')
                : value === EntityType.organization
                  ? t('entities.organization')
                  : value;
            return (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {label}
              </span>
            );
          },
        }),
        columnHelper.accessor('phone', {
          enableSorting: false,
          header: t('entities.phone'),
          cell: (info) => {
            const value = info.getValue();
            return (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {value || '-'}
              </div>
            );
          },
        }),
        columnHelper.accessor('email', {
          enableSorting: false,
          header: t('entities.email'),
          cell: (info) => {
            const value = info.getValue();
            return (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {value || '-'}
              </div>
            );
          },
        }),
        columnHelper.accessor('address', {
          enableSorting: false,
          header: t('entities.address'),
          cell: (info) => {
            const value = info.getValue();
            return (
              <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                {value || '-'}
              </div>
            );
          },
        }),
        columnHelper.accessor('note', {
          enableSorting: false,
          header: t('entities.note'),
          cell: (info) => {
            const value = info.getValue();
            return (
              <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                {value || '-'}
              </div>
            );
          },
        }),
      ] as ColumnDef<EntityFull>[],
    [t],
  );

  return (
    <DataTable
      data={entities}
      columns={columns}
      isLoading={isLoading}
      actions={{
        onEdit,
        onDelete,
        headerLabel: t('entities.actions'),
      }}
      onRowClick={onEdit}
      emptyMessage={t('entities.noEntities')}
      search={search}
      pageSize={pageSize}
      filters={filters}
      pagination={pagination}
      sorting={sorting}
    />
  );
};

export default EntityTable;
