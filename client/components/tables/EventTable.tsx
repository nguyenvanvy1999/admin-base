import type { EventResponse } from '@server/dto/event.dto';
import { useMemo } from 'react';
import { DataTable, type DataTableColumn } from './DataTable';
import { createActionColumn, createDateColumn } from './tables/columnFactories';
import { DeleteManyToolbar } from './tables/deleteManyToolbar';

type EventTableProps = {
  events: EventResponse[];
  onEdit: (event: EventResponse) => void;
  onDelete: (event: EventResponse) => void;
  onDeleteMany?: (ids: string[]) => void;
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
  selectedRecords?: EventResponse[];
  onSelectedRecordsChange?: (records: EventResponse[]) => void;
};

const EventTable = ({
  events,
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
}: EventTableProps) => {
  const columns = useMemo(
    (): DataTableColumn<EventResponse>[] => [
      {
        accessor: 'name',
        title: 'events.name',
      },
      createDateColumn<EventResponse>({
        accessor: 'startAt',
        title: 'events.startAt',
        getValue: (row) => row.startAt,
      }),
      createDateColumn<EventResponse>({
        accessor: 'endAt',
        title: 'events.endAt',
        getValue: (row) => row.endAt,
      }),
      createActionColumn<EventResponse>({
        title: 'events.actions',
        onEdit,
        onDelete,
      }),
    ],
    [onEdit, onDelete],
  );

  return (
    <DataTable
      data={events}
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

export default EventTable;
