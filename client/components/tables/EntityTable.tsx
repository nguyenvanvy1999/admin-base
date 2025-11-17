import type { EntityResponse } from '@server/dto/entity.dto';
import { EntityType } from '@server/generated';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SortingState } from '@/components';
import { createActionColumn } from '@/components/DataTable/utils';
import { createTypeColumn } from '@/components/tables/columnFactories';
import { DataTable, type DataTableColumn } from './DataTable';
import { DeleteManyToolbar } from './deleteManyToolbar';

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
  sorting?: SortingState;
  onSortingChange?: (
    updater: SortingState | ((prev: SortingState) => SortingState),
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
      createTypeColumn<EntityResponse>({
        accessor: 'type',
        title: 'entities.type',
        getType: (row) => row.type || '',
        labelMap: {
          [EntityType.individual]: t('entities.individual'),
          [EntityType.organization]: t('entities.organization'),
        },
        defaultColor: 'blue',
      }),
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
      createActionColumn<EntityResponse>({
        title: 'entities.actions',
        onEdit,
        onDelete,
      }),
    ],
    [t, onEdit, onDelete],
  );

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

export default EntityTable;
