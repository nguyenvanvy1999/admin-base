import type { TagResponse } from '@server/dto/tag.dto';
import { useMemo } from 'react';
import { createActionColumn, createTextColumn } from './columnFactories';
import { DataTable, type DataTableColumn } from './DataTable';
import { DeleteManyToolbar } from './deleteManyToolbar';
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
  const columns = useMemo(
    (): DataTableColumn<TagResponse>[] => [
      createTextColumn<TagResponse, 'name'>({
        accessor: 'name',
        title: 'tags.name',
      }),
      createTextColumn<TagResponse, 'description'>({
        accessor: 'description',
        title: 'tags.description',
        ellipsis: true,
        enableSorting: false,
      }),
      createActionColumn<TagResponse>({
        title: 'tags.actions',
        onEdit,
        onDelete,
      }),
    ],
    [onEdit, onDelete],
  );

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

export default TagTable;
