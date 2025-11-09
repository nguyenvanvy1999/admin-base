import type { TagFull } from '@client/types/tag';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DataTable, {
  type DataTableColumn,
  type DataTableProps,
} from './DataTable';

type TagTableProps = {
  tags: TagFull[];
  onEdit: (tag: TagFull) => void;
  onDelete: (tag: TagFull) => void;
  isLoading?: boolean;
} & Pick<
  DataTableProps<TagFull>,
  'search' | 'pageSize' | 'filters' | 'pagination' | 'sorting'
>;

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
    (): DataTableColumn<TagFull>[] => [
      {
        accessor: 'name',
        title: 'tags.name',
        enableSorting: true,
      },
      {
        accessor: 'description',
        title: 'tags.description',
        enableSorting: false,
        ellipsis: true,
      },
    ],
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
