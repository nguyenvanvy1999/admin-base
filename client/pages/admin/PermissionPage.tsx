import {
  FormComponent,
  type FormComponentRef,
} from '@client/components/FormComponent';
import { PageContainer } from '@client/components/PageContainer';
import PermissionTable from '@client/components/PermissionTable';
import { ZodFormController } from '@client/components/ZodFormController';
import { usePermissionsQuery } from '@client/hooks/queries/usePermissionQueries';
import { usePermission } from '@client/hooks/usePermission';
import { useZodForm } from '@client/hooks/useZodForm';
import NotFoundPage from '@client/pages/NotFoundPage';
import { Group, TextInput } from '@mantine/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { z } from 'zod';

const filterSchema = z.object({
  search: z.string().optional(),
});

type FilterFormValue = z.infer<typeof filterSchema>;

const defaultFilterValues: FilterFormValue = {
  search: '',
};

function extractCategory(title: string): string {
  const parts = title.split('.');
  return parts[0] || title;
}

const PermissionPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formRef = useRef<FormComponentRef>(null);
  const { hasPermission } = usePermission();

  const canView = hasPermission('ROLE.VIEW');

  useEffect(() => {
    if (!canView) {
      navigate('/404');
    }
  }, [canView, navigate]);

  if (!canView) {
    return <NotFoundPage />;
  }

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]);

  const form = useZodForm({
    zod: filterSchema,
    defaultValues: defaultFilterValues,
  });

  const { data: allPermissions = [], isLoading } = usePermissionsQuery({
    enabled: canView,
    retry: false,
  });

  const searchValue = form.watch('search') || '';

  const filteredAndSortedPermissions = useMemo(() => {
    if (!allPermissions || !Array.isArray(allPermissions)) {
      return [];
    }
    let filtered = allPermissions.filter(
      (perm) => perm && perm.id && perm.title,
    );

    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase();
      filtered = filtered.filter(
        (perm) =>
          perm &&
          perm.title &&
          (perm.title.toLowerCase().includes(searchLower) ||
            perm.description?.toLowerCase().includes(searchLower) ||
            extractCategory(perm.title).toLowerCase().includes(searchLower)),
      );
    }

    if (sorting.length > 0) {
      const sort = sorting[0];
      filtered.sort((a, b) => {
        if (!a || !b) return 0;
        let aValue: string | number;
        let bValue: string | number;

        if (sort.id === 'title') {
          aValue = a.title || '';
          bValue = b.title || '';
        } else if (sort.id === 'category') {
          aValue = extractCategory(a.title);
          bValue = extractCategory(b.title);
        } else if (sort.id === 'description') {
          aValue = a.description || '';
          bValue = b.description || '';
        } else {
          return 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sort.desc ? -comparison : comparison;
        }

        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return sort.desc ? -comparison : comparison;
      });
    } else {
      filtered.sort((a, b) => {
        if (!a || !b || !a.title || !b.title) return 0;
        return a.title.localeCompare(b.title);
      });
    }

    return filtered;
  }, [allPermissions, searchValue, sorting]);

  const totalRecords = filteredAndSortedPermissions.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedPermissions = filteredAndSortedPermissions.slice(
    startIndex,
    endIndex,
  );

  const handleSearch = () => {
    setPage(1);
  };

  const handleReset = () => {
    form.reset(defaultFilterValues);
    setPage(1);
  };

  const handleSortingChange = (
    updater:
      | { id: string; desc: boolean }[]
      | ((prev: { id: string; desc: boolean }[]) => {
          id: string;
          desc: boolean;
        }[]),
  ) => {
    const newSorting =
      typeof updater === 'function' ? updater(sorting) : updater;
    setSorting(newSorting);
    setPage(1);
  };

  return (
    <PageContainer
      filterGroup={
        <FormComponent ref={formRef}>
          <Group>
            <ZodFormController
              control={form.control}
              name="search"
              render={({ field, fieldState: { error } }) => (
                <TextInput
                  placeholder={t('permissions.search')}
                  error={error}
                  style={{ flex: 1, maxWidth: '300px' }}
                  {...field}
                />
              )}
            />
          </Group>
        </FormComponent>
      }
      onSearch={handleSearch}
      onReset={handleReset}
    >
      <PermissionTable
        permissions={paginatedPermissions || []}
        isLoading={isLoading}
        recordsPerPage={limit}
        recordsPerPageOptions={[10, 20, 50, 100]}
        onRecordsPerPageChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        page={page}
        onPageChange={setPage}
        totalRecords={totalRecords || 0}
        sorting={sorting || []}
        onSortingChange={handleSortingChange}
      />
    </PageContainer>
  );
};

export default PermissionPage;
