import type { EntityFull } from '@client/types/entity';
import { EntityType } from '@server/generated/prisma/enums';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DataTable, {
  type DataTableColumn,
  type DataTableProps,
} from './DataTable';

type EntityTableProps = {
  entities: EntityFull[];
  onEdit: (entity: EntityFull) => void;
  onDelete: (entity: EntityFull) => void;
  isLoading?: boolean;
} & Pick<
  DataTableProps<EntityFull>,
  'search' | 'pageSize' | 'filters' | 'pagination' | 'sorting'
>;

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
    (): DataTableColumn<EntityFull>[] => [
      {
        accessor: 'name',
        title: 'entities.name',
        enableSorting: true,
      },
      {
        accessor: 'type',
        title: 'entities.type',
        enableSorting: true,
        render: (value) => {
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
      },
      {
        accessor: 'phone',
        title: 'entities.phone',
        enableSorting: false,
        ellipsis: true,
      },
      {
        accessor: 'email',
        title: 'entities.email',
        enableSorting: false,
        ellipsis: true,
      },
      {
        accessor: 'address',
        title: 'entities.address',
        enableSorting: false,
        ellipsis: true,
      },
      {
        accessor: 'note',
        title: 'entities.note',
        enableSorting: false,
        ellipsis: true,
      },
    ],
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
