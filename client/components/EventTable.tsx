import { ActionIcon, Button } from '@mantine/core';
import type { EventResponse } from '@server/dto/event.dto';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from './DataTable';
import { formatDate } from './DataTable/formatters';

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
  const { t } = useTranslation();
  const columns = useMemo(
    (): DataTableColumn<EventResponse>[] => [
      {
        accessor: 'name',
        title: 'events.name',
      },
      {
        accessor: 'startAt',
        title: 'events.startAt',
        render: (value) => {
          if (!value) return <span className="text-gray-400">-</span>;
          return <span>{formatDate(String(value))}</span>;
        },
      },
      {
        accessor: 'endAt',
        title: 'events.endAt',
        render: (value) => {
          if (!value) return <span className="text-gray-400">-</span>;
          return <span>{formatDate(String(value))}</span>;
        },
      },
      {
        title: 'events.actions',
        textAlign: 'center',
        width: '8rem',
        render: (value, row: EventResponse) => (
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

  const selectedCount = selectedRecords?.length || 0;

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
        onDeleteMany && selectedCount > 0
          ? ({ table }) => (
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

export default EventTable;
