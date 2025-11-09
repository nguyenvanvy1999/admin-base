import type { TagFull } from '@client/types/tag';
import type { ColumnDef } from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DataTable, { type DataTableProps } from './DataTable';

type TagTableProps = {
  tags: TagFull[];
  onEdit: (tag: TagFull) => void;
  onDelete: (tag: TagFull) => void;
  isLoading?: boolean;
} & Pick<
  DataTableProps<TagFull>,
  'search' | 'pageSize' | 'filters' | 'pagination' | 'sorting'
>;

const columnHelper = createColumnHelper<TagFull>();

const TagTable = ({
  tags,
  onEdit,
  onDelete,
  isLoading = false,
  search,
  pageSize,
  filters,
  pagination,
  sorting,
}: TagTableProps) => {
  const { t } = useTranslation();

  const columns = useMemo(
    () =>
      [
        columnHelper.accessor('name', {
          header: t('tags.name'),
          enableSorting: true,
          cell: (info) => (
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {info.getValue()}
            </div>
          ),
        }),
        columnHelper.accessor('description', {
          enableSorting: false,
          header: t('tags.description'),
          cell: (info) => {
            const value = info.getValue();
            return (
              <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                {value || '-'}
              </div>
            );
          },
        }),
      ] as ColumnDef<TagFull>[],
    [t],
  );

  return (
    <DataTable
      data={tags}
      columns={columns}
      isLoading={isLoading}
      actions={{
        onEdit,
        onDelete,
        headerLabel: t('tags.actions'),
      }}
      onRowClick={onEdit}
      emptyMessage={t('tags.noTags')}
      search={search}
      pageSize={pageSize}
      filters={filters}
      pagination={pagination}
      sorting={sorting}
    />
  );
};

export default TagTable;
