import { ActionIcon } from '@mantine/core';
import type { EventResponse } from '@server/dto/event.dto';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useMemo } from 'react';
import { DataTable, type DataTableColumn } from './DataTable';
import { formatDate } from './DataTable/formatters';

type EventTableProps = {
  events: EventResponse[];
  onEdit: (event: EventResponse) => void;
  onDelete: (event: EventResponse) => void;
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

const EventTable = ({
  events,
  onEdit,
  onDelete,
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
}: EventTableProps) => {
  const columns = useMemo(
    (): DataTableColumn<EventResponse>[] => [
      {
        accessor: 'name',
        title: 'events.name',
      },
      {
        accessor: 'startAt',
        title: 'events.startAt',
        render: (value: unknown) => {
          if (!value) return <span className="text-gray-400">-</span>;
          return <span>{formatDate(String(value))}</span>;
        },
      },
      {
        accessor: 'endAt',
        title: 'events.endAt',
        render: (value: unknown) => {
          if (!value) return <span className="text-gray-400">-</span>;
          return <span>{formatDate(String(value))}</span>;
        },
      },
      {
        title: 'events.actions',
        textAlign: 'center',
        width: '8rem',
        render: (value: unknown, row: EventResponse) => (
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
    />
  );
};

export default EventTable;
