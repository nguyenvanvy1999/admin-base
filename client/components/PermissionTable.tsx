import type { PermissionResponse } from '@client/services/PermissionService';
import { Badge } from '@mantine/core';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from './DataTable';

function extractCategory(title: string | null | undefined): string {
  if (!title) return 'UNKNOWN';
  const parts = title.split('.');
  return parts[0] || title;
}

type PermissionTableProps = {
  permissions: PermissionResponse[];
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

const PermissionTable = ({
  permissions,
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
}: PermissionTableProps) => {
  const { t } = useTranslation();

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      USER: 'blue',
      ROLE: 'green',
      SESSION: 'orange',
      ADMIN: 'red',
    };
    return colors[category] || 'gray';
  };

  const columns = useMemo(
    (): DataTableColumn<PermissionResponse>[] => [
      {
        accessor: 'title',
        title: 'permissions.permissionTitle',
      },
      {
        accessor: 'category',
        title: 'permissions.category',
        render: (
          value: unknown,
          row: PermissionResponse & { category?: string },
        ) => {
          if (!row || !row.title) {
            return (
              <Badge color="gray" variant="light">
                -
              </Badge>
            );
          }
          const category = row.category || extractCategory(row.title);
          const categoryLabel =
            t(`permissions.categories.${category}`, {
              defaultValue: category,
            }) || category;
          return (
            <Badge color={getCategoryColor(category)} variant="light">
              {categoryLabel}
            </Badge>
          );
        },
      },
      {
        accessor: 'description',
        title: 'permissions.description',
        ellipsis: true,
        render: (value: unknown) => {
          if (!value) return <span className="text-gray-400">-</span>;
          return <span>{String(value)}</span>;
        },
      },
    ],
    [t],
  );

  const permissionsWithCategory = useMemo(() => {
    if (!permissions || !Array.isArray(permissions)) {
      return [];
    }
    return permissions
      .filter((perm) => perm && perm.id && perm.title)
      .map((perm) => ({
        ...perm,
        category: extractCategory(perm.title),
      }));
  }, [permissions]);

  return (
    <DataTable
      data={permissionsWithCategory}
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

export default PermissionTable;
