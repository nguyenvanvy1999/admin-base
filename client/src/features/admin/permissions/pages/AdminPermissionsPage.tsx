import type { ProColumns } from '@ant-design/pro-components';
import { Card, Input, Select, Space, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import { useAdminPermissions } from 'src/hooks/api/useAdminPermissions';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import type { AdminPermission } from 'src/types/admin-roles';

type AdminPermissionTableParams = {
  category?: string[];
  search?: string;
};

export default function AdminPermissionsPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const canView = hasPermission('ROLE.VIEW');

  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<string>('');

  const { data: permissions = [], isLoading } = useAdminPermissions();

  const categories = useMemo(() => {
    const cats = new Set<string>();
    permissions.forEach((perm) => {
      const [category] = perm.title.split('.');
      if (category) cats.add(category);
    });
    return Array.from(cats).sort();
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    let filtered = permissions;

    if (categoryFilter.length > 0) {
      filtered = filtered.filter((perm) => {
        const [category] = perm.title.split('.');
        return categoryFilter.includes(category);
      });
    }

    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(
        (perm) =>
          perm.title.toLowerCase().includes(searchLower) ||
          perm.description?.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }, [permissions, categoryFilter, searchText]);

  const columns: ProColumns<AdminPermission>[] = [
    {
      title: t('adminPermissionsPage.table.title'),
      dataIndex: 'title',
      copyable: true,
      ellipsis: true,
      width: 200,
      render: (_, record) => {
        const [category, action] = record.title.split('.');
        return (
          <Space>
            <Tag color="blue">{category}</Tag>
            <span>{action}</span>
          </Space>
        );
      },
    },
    {
      title: t('adminPermissionsPage.table.category'),
      dataIndex: 'category',
      hideInTable: true,
      valueType: 'select',
      fieldProps: {
        placeholder: t('adminPermissionsPage.table.filters.category'),
        allowClear: true,
        options: categories.map((cat) => ({
          label: t(`adminPermissionsPage.categories.${cat}` as any) || cat,
          value: cat,
        })),
      },
      render: (_, record) => {
        const [category] = record.title.split('.');
        return (
          <Tag color="blue">
            {t(`adminPermissionsPage.categories.${category}` as any) ||
              category}
          </Tag>
        );
      },
    },
    {
      title: t('adminPermissionsPage.table.action'),
      dataIndex: 'action',
      hideInSearch: true,
      render: (_, record) => {
        const [, action] = record.title.split('.');
        return (
          <Tag color="green">
            {t(`adminPermissionsPage.actions.${action}` as any) || action}
          </Tag>
        );
      },
    },
    {
      title: t('adminPermissionsPage.table.description'),
      dataIndex: 'description',
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => {
        const description =
          record.description ||
          t(`adminPermissionsPage.descriptions.${record.title}` as any) ||
          '-';
        return <span>{description}</span>;
      },
    },
  ];

  if (!canView) {
    return null;
  }

  return (
    <AppPage>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
          <Space wrap>
            <Input.Search
              placeholder={t('common.table.filters.search')}
              allowClear
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select
              mode="multiple"
              placeholder={t('adminPermissionsPage.table.filters.category')}
              allowClear
              style={{ width: 200 }}
              value={categoryFilter}
              onChange={(value) => {
                setCategoryFilter(value || []);
              }}
              options={categories.map((cat) => ({
                label:
                  t(`adminPermissionsPage.categories.${cat}` as any) || cat,
                value: cat,
              }))}
            />
          </Space>
        </Space>
      </Card>

      <AppTable<AdminPermission, AdminPermissionTableParams>
        rowKey="id"
        columns={columns}
        loading={isLoading}
        search={false}
        dataSource={filteredPermissions}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) =>
            t('common.pagination.totalPermissions', { total }),
        }}
        toolBarRender={() => []}
      />
    </AppPage>
  );
}
