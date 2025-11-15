import { ActionIcon, Button } from '@mantine/core';
import type { EntityResponse } from '@server/dto/entity.dto';
import { EntityType } from '@server/generated';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from './DataTable';

type EntityTableProps = {
  entities: EntityResponse[];
  onEdit: (entity: EntityResponse) => void;
  onDelete: (entity: EntityResponse) => void;
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
  selectedRecords?: EntityResponse[];
  onSelectedRecordsChange?: (records: EntityResponse[]) => void;
};

const EntityTable = ({
  entities,
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
}: EntityTableProps) => {
  const { t } = useTranslation();

  const columns = useMemo(
    (): DataTableColumn<EntityResponse>[] => [
      {
        accessor: 'name',
        title: 'entities.name',
      },
      {
        accessor: 'type',
        title: 'entities.type',
        render: (value, row: EntityResponse) => {
          if (!row.type) return <span className="text-gray-400">-</span>;
          const label =
            row.type === EntityType.individual
              ? t('entities.individual')
              : row.type === EntityType.organization
                ? t('entities.organization')
                : row.type;
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
        ellipsis: true,
      },
      {
        accessor: 'email',
        title: 'entities.email',
        ellipsis: true,
      },
      {
        accessor: 'address',
        title: 'entities.address',
        ellipsis: true,
      },
      {
        accessor: 'note',
        title: 'entities.note',
        ellipsis: true,
      },
      {
        title: 'entities.actions',
        textAlign: 'center',
        width: '8rem',
        render: (value, row: EntityResponse) => (
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
      data={entities}
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

export default EntityTable;
