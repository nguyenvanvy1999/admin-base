import type { EntityFull } from '@client/types/entity';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type EntityTableProps = {
  entities: EntityFull[];
  onEdit: (entity: EntityFull) => void;
  onDelete: (entity: EntityFull) => void;
  isLoading?: boolean;
};

const columnHelper = createColumnHelper<EntityFull>();

const EntityTable = ({
  entities,
  onEdit,
  onDelete,
  isLoading = false,
}: EntityTableProps) => {
  const { t } = useTranslation();

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: t('entities.name'),
        cell: (info) => (
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.accessor('type', {
        header: t('entities.type'),
        cell: (info) => {
          const value = info.getValue();
          if (!value) return <span className="text-gray-400">-</span>;
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {value}
            </span>
          );
        },
      }),
      columnHelper.accessor('phone', {
        header: t('entities.phone'),
        cell: (info) => {
          const value = info.getValue();
          return (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {value || '-'}
            </div>
          );
        },
      }),
      columnHelper.accessor('email', {
        header: t('entities.email'),
        cell: (info) => {
          const value = info.getValue();
          return (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {value || '-'}
            </div>
          );
        },
      }),
      columnHelper.accessor('address', {
        header: t('entities.address'),
        cell: (info) => {
          const value = info.getValue();
          return (
            <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
              {value || '-'}
            </div>
          );
        },
      }),
      columnHelper.accessor('note', {
        header: t('entities.note'),
        cell: (info) => {
          const value = info.getValue();
          return (
            <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
              {value || '-'}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: t('entities.actions'),
        cell: (info) => {
          const entity = info.row.original;
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(entity);
                }}
                className="p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
                aria-label={t('common.edit')}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(entity);
                }}
                className="p-2 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                aria-label={t('common.delete')}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          );
        },
      }),
    ],
    [t, onEdit, onDelete],
  );

  const table = useReactTable({
    data: entities,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {table.getHeaderGroups()[0]?.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="animate-pulse">
                {table.getHeaderGroups()[0]?.headers.map((header) => (
                  <td key={header.id} className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {t('entities.noEntities')}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
              onClick={() => onEdit(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EntityTable;
