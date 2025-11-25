import type { EntityResponse } from '@server/dto/entity.dto';
import { EntityType } from '@server/generated';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createActionColumn,
  createTextColumn,
  createTypeColumn,
} from './columnFactories';
import { DataTable, type DataTableColumn } from './DataTable';
import { DeleteManyToolbar } from './deleteManyToolbar';
import type { SortingState } from './types';

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
      createTextColumn<EntityResponse, 'name'>({
        accessor: 'name',
        title: 'entities.name',
      }),
      createTypeColumn<EntityResponse, 'type'>({
        accessor: 'type',
        title: 'entities.type',
        labelMap: {
          [EntityType.individual]: t('entities.individual'),
          [EntityType.organization]: t('entities.organization'),
        },
        defaultColor: 'blue',
      }),
      createTextColumn<EntityResponse, 'phone'>({
        accessor: 'phone',
        title: 'entities.phone',
        ellipsis: true,
      }),
      createTextColumn<EntityResponse, 'email'>({
        accessor: 'email',
        title: 'entities.email',
        ellipsis: true,
      }),
      createTextColumn<EntityResponse, 'address'>({
        accessor: 'address',
        title: 'entities.address',
        ellipsis: true,
      }),
      createTextColumn<EntityResponse, 'note'>({
        accessor: 'note',
        title: 'entities.note',
        ellipsis: true,
      }),
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
