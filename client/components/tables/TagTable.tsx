import { ActionIcon, Button } from '@mantine/core';
import type { TagResponse } from '@server/dto/tag.dto';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from './DataTable';
import type { SortingState } from './types';

type TagTableProps = {
  tags: TagResponse[];
  onEdit: (tag: TagResponse) => void;
  onDelete: (tag: TagResponse) => void;
  onDeleteMany?: (ids: string[]) => void;
  isLoading?: boolean;
  showIndexColumn?: boolean;
  recordsPerPage?: number;
  recordsPerPageOptions?: number[];
  onRecordsPerPageChange?: (size: number) => void;
  page?: number;
  onPageChange?: (page: number) => void;
  totalRecords?: number;
  sorting?: SortingState;
  onSortingChange?: (
    updater: SortingState | ((prev: SortingState) => SortingState),
  ) => void;
  selectedRecords?: TagResponse[];
  onSelectedRecordsChange?: (records: TagResponse[]) => void;
};

const TagTable = ({
  tags,
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
}: TagTableProps) => {
  const { t } = useTranslation();

  const columns = useMemo(
    (): DataTableColumn<TagResponse>[] => [
      {
        accessor: 'name',
        title: 'tags.name',
      },
      {
        accessor: 'description',
        title: 'tags.description',
        ellipsis: true,
        enableSorting: false,
      },
      {
        title: 'tags.actions',
        textAlign: 'center',
        width: '8rem',
        render: (value, row: TagResponse) => (
          <div className="flex items-center justify-center gap-2">
            <ActionIcon
              variant="subtle"
              color="blue"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row);
              }}
            >
              <IconEdit size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row);
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </div>
        ),
      },
    ],
    [t, onEdit, onDelete],
  );

  const selectedCount = selectedRecords?.length || 0;

  return (
    <DataTable
      data={tags}
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
      selectedRecords={selectedRecords}
      onSelectedRecordsChange={onSelectedRecordsChange}
      renderTopToolbarCustomActions={
        onDeleteMany && selectedCount > 0
          ? () => (
              <Button
                color="red"
                variant="filled"
                leftSection={<IconTrash size={16} />}
                onClick={() => {
                  const selectedIds = selectedRecords?.map((r) => r.id) || [];
                  if (selectedIds.length > 0 && onDeleteMany) {
                    onDeleteMany(selectedIds);
                  }
                }}
                disabled={isLoading}
              >
                {t('common.deleteSelected', {
                  defaultValue: `Delete ${selectedCount}`,
                  count: selectedCount,
                })}
              </Button>
            )
          : undefined
      }
    />
  );
};

export default TagTable;
