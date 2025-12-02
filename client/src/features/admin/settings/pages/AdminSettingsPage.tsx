import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Select,
  Space,
  Tabs,
  Tag,
} from 'antd';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import { SettingFormModal } from 'src/features/admin/settings/components/SettingFormModal';
import {
  useAdminSettings,
  useUpdateSetting,
} from 'src/hooks/api/useAdminSettings';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import {
  getSettingCategory,
  parseSettingValue,
} from 'src/lib/utils/setting.utils';
import type { AdminSetting } from 'src/types/admin-settings';
import { SettingDataType } from 'src/types/admin-settings';

type AdminSettingTableParams = {
  category?: string;
  search?: string;
};

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const actionRef = useRef<ActionType | null>(null);
  const { hasPermission } = usePermissions();
  const canView = hasPermission('SETTING.VIEW');
  const canUpdate = hasPermission('SETTING.UPDATE');

  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [searchText, setSearchText] = useState<string>('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<AdminSetting | null>(
    null,
  );

  const { data: settings = [], isLoading } = useAdminSettings();

  const updateMutation = useUpdateSetting({
    onSuccess: () => {
      setFormModalOpen(false);
      setEditingSetting(null);
      actionRef.current?.reload();
    },
  });

  const categories = useMemo(() => {
    const cats = new Set<string>();
    settings.forEach((setting) => {
      const category = getSettingCategory(setting.key);
      cats.add(category);
    });
    return Array.from(cats).sort();
  }, [settings]);

  const filteredSettings = useMemo(() => {
    let filtered = settings;

    if (categoryFilter) {
      filtered = filtered.filter((setting) => {
        const category = getSettingCategory(setting.key);
        return category === categoryFilter;
      });
    }

    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(
        (setting) =>
          setting.key.toLowerCase().includes(searchLower) ||
          setting.description?.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }, [settings, categoryFilter, searchText]);

  const groupedSettings = useMemo(() => {
    const groups: Record<string, AdminSetting[]> = {
      security: [],
      rateLimit: [],
      system: [],
      other: [],
    };

    filteredSettings.forEach((setting) => {
      const category = getSettingCategory(setting.key);
      if (groups[category]) {
        groups[category].push(setting);
      } else {
        groups.other.push(setting);
      }
    });

    return groups;
  }, [filteredSettings]);

  const renderValue = (setting: AdminSetting) => {
    const parsedValue = parseSettingValue(setting);
    const { type, isSecret, value } = setting;

    if (isSecret && value === '************') {
      return (
        <Space>
          <Tag color="red">Secret</Tag>
          <span>************</span>
        </Space>
      );
    }

    switch (type) {
      case SettingDataType.BOOLEAN:
        return (
          <Tag color={parsedValue ? 'green' : 'default'}>
            {parsedValue ? t('common.enabled') : t('common.disabled')}
          </Tag>
        );
      case SettingDataType.NUMBER:
        return <span>{parsedValue}</span>;
      case SettingDataType.DATE:
        return (
          <span>
            {new Date(parsedValue).toLocaleString('vi-VN', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </span>
        );
      case SettingDataType.JSON:
        return (
          <code style={{ fontSize: '12px' }}>
            {JSON.stringify(parsedValue, null, 2).substring(0, 50)}
            {JSON.stringify(parsedValue).length > 50 ? '...' : ''}
          </code>
        );
      default:
        return <span>{value}</span>;
    }
  };

  const columns: ProColumns<AdminSetting>[] = [
    {
      title: t('adminSettingsPage.table.key'),
      dataIndex: 'key',
      copyable: true,
      ellipsis: true,
      width: 250,
    },
    {
      title: t('adminSettingsPage.table.description'),
      dataIndex: 'description',
      ellipsis: true,
      width: 300,
      render: (_, record) => record.description ?? '-',
    },
    {
      title: t('adminSettingsPage.table.type'),
      dataIndex: 'type',
      hideInSearch: true,
      width: 100,
      render: (_, record) => (
        <Tag color="blue">{t(`adminSettingsPage.types.${record.type}`)}</Tag>
      ),
    },
    {
      title: t('adminSettingsPage.table.value'),
      dataIndex: 'value',
      hideInSearch: true,
      width: 200,
      render: (_, record) => renderValue(record),
    },
    {
      title: t('adminSettingsPage.table.isSecret'),
      dataIndex: 'isSecret',
      hideInSearch: true,
      width: 100,
      render: (_, record) =>
        record.isSecret ? (
          <Badge status="error" text={t('adminSettingsPage.secret')} />
        ) : (
          '-'
        ),
    },
    {
      title: t('adminSettingsPage.table.category'),
      dataIndex: 'category',
      hideInTable: true,
      valueType: 'select',
      fieldProps: {
        placeholder: t('adminSettingsPage.table.filters.category'),
        allowClear: true,
        options: categories.map((cat) => ({
          label: t(`adminSettingsPage.categories.${cat}` as any) || cat,
          value: cat,
        })),
      },
      render: (_, record) => {
        const category = getSettingCategory(record.key);
        return (
          <Tag color="purple">
            {t(`adminSettingsPage.categories.${category}` as any) || category}
          </Tag>
        );
      },
    },
    {
      title: t('adminSettingsPage.table.actions'),
      dataIndex: 'actions',
      valueType: 'option',
      hideInTable: !canUpdate,
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => {
            setEditingSetting(record);
            setFormModalOpen(true);
          }}
        >
          {t('adminSettingsPage.actions.edit')}
        </Button>
      ),
    },
  ];

  if (!canView) {
    return null;
  }

  const tabItems = [
    {
      key: 'all',
      label: t('adminSettingsPage.tabs.all'),
      children: (
        <AppTable<AdminSetting, AdminSettingTableParams>
          rowKey="id"
          columns={columns}
          actionRef={actionRef}
          loading={isLoading}
          search={false}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Tổng ${total} settings`,
          }}
          request={() => {
            return Promise.resolve({
              data: filteredSettings,
              success: true,
              total: filteredSettings.length,
            });
          }}
          toolBarRender={() => []}
        />
      ),
    },
    {
      key: 'security',
      label: t('adminSettingsPage.categories.security'),
      children: (
        <AppTable<AdminSetting, AdminSettingTableParams>
          rowKey="id"
          columns={columns}
          actionRef={actionRef}
          loading={isLoading}
          search={false}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Tổng ${total} settings`,
          }}
          request={() => {
            return Promise.resolve({
              data: groupedSettings.security,
              success: true,
              total: groupedSettings.security.length,
            });
          }}
          toolBarRender={() => []}
        />
      ),
    },
    {
      key: 'rateLimit',
      label: t('adminSettingsPage.categories.rateLimit'),
      children: (
        <AppTable<AdminSetting, AdminSettingTableParams>
          rowKey="id"
          columns={columns}
          actionRef={actionRef}
          loading={isLoading}
          search={false}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Tổng ${total} settings`,
          }}
          request={() => {
            return Promise.resolve({
              data: groupedSettings.rateLimit,
              success: true,
              total: groupedSettings.rateLimit.length,
            });
          }}
          toolBarRender={() => []}
        />
      ),
    },
    {
      key: 'system',
      label: t('adminSettingsPage.categories.system'),
      children: (
        <AppTable<AdminSetting, AdminSettingTableParams>
          rowKey="id"
          columns={columns}
          actionRef={actionRef}
          loading={isLoading}
          search={false}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Tổng ${total} settings`,
          }}
          request={() => {
            return Promise.resolve({
              data: groupedSettings.system,
              success: true,
              total: groupedSettings.system.length,
            });
          }}
          toolBarRender={() => []}
        />
      ),
    },
  ];

  return (
    <AppPage
      title={t('adminSettingsPage.title')}
      subtitle={t('adminSettingsPage.subtitle')}
    >
      <Alert
        message={t('adminSettingsPage.info.title')}
        description={t('adminSettingsPage.info.description')}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space wrap>
            <Input.Search
              placeholder={t('adminSettingsPage.table.filters.search')}
              allowClear
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={() => actionRef.current?.reload()}
            />
            <Select
              placeholder={t('adminSettingsPage.table.filters.category')}
              allowClear
              style={{ width: 200 }}
              value={categoryFilter}
              onChange={(value) => {
                setCategoryFilter(value);
                actionRef.current?.reload();
              }}
              options={categories.map((cat) => ({
                label: t(`adminSettingsPage.categories.${cat}` as any) || cat,
                value: cat,
              }))}
            />
          </Space>
        </Space>
      </Card>

      <Tabs items={tabItems} />

      <SettingFormModal
        open={formModalOpen}
        setting={editingSetting}
        onClose={() => {
          setFormModalOpen(false);
          setEditingSetting(null);
        }}
        onSubmit={async (data) => {
          if (editingSetting) {
            await updateMutation.mutateAsync({
              id: editingSetting.id,
              ...data,
            });
          }
        }}
        loading={updateMutation.isPending}
      />
    </AppPage>
  );
}
