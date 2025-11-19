import type { PermissionResponse } from '@client/services/PermissionService';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createTextColumn, createTypeColumn } from './columnFactories';
import { DataTable, type DataTableColumn } from './DataTable';

function extractCategory(title: string | null | undefined): string {
  if (!title) return 'UNKNOWN';
  const parts = title.split('.');
  return parts[0] || title;
}

type PermissionWithCategory = PermissionResponse & { category: string };

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

  const categoryLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    ['USER', 'ROLE', 'SESSION', 'ADMIN'].forEach((cat) => {
      map[cat] =
        t(`permissions.categories.${cat}`, { defaultValue: cat }) || cat;
    });
    return map;
  }, [t]);

  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    ['USER', 'ROLE', 'SESSION', 'ADMIN'].forEach((cat) => {
      map[cat] = getCategoryColor(cat);
    });
    return map;
  }, []);

  const columns = useMemo(
    (): DataTableColumn<PermissionWithCategory>[] => [
      createTextColumn<PermissionWithCategory, 'title'>({
        accessor: 'title',
        title: 'permissions.permissionTitle',
      }),
      createTypeColumn<PermissionWithCategory, 'category'>({
        accessor: 'category',
        title: 'permissions.category',
        labelMap: categoryLabelMap,
        colorMap: categoryColorMap,
        defaultColor: 'gray',
      }),
      createTextColumn<PermissionWithCategory, 'description'>({
        accessor: 'description',
        title: 'permissions.description',
        ellipsis: true,
      }),
    ],
    [categoryLabelMap, categoryColorMap],
  );

  const permissionsWithCategory = useMemo((): PermissionWithCategory[] => {
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
