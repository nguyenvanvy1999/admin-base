import type { EventResponse } from '@server/dto/event.dto';
import { useMemo } from 'react';
import {
  createActionColumn,
  createDateColumn,
  createTextColumn,
} from './columnFactories';
import { DataTable, type DataTableColumn } from './DataTable';
import { DeleteManyToolbar } from './deleteManyToolbar';

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
      createTextColumn<EventResponse, 'name'>({
        accessor: 'name',
        title: 'events.name',
      }),
      createDateColumn<EventResponse, 'startAt'>({
        accessor: 'startAt',
        title: 'events.startAt',
        format: 'YYYY-MM-DD HH:mm',
      }),
      createDateColumn<EventResponse, 'endAt'>({
        accessor: 'endAt',
        title: 'events.endAt',
        format: 'YYYY-MM-DD HH:mm',
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
