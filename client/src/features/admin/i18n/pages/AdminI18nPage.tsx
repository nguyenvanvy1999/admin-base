import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Input, Popconfirm, Space } from 'antd';
import type { TableRowSelection } from 'antd/es/table/interface';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import { ImportExportActions } from 'src/components/common/ImportExportActions';
import { I18nFormModal } from 'src/features/admin/i18n/components/I18nFormModal';
import { useAdminI18nPagination } from 'src/features/admin/i18n/hooks/useAdminI18nPagination';
import {
  useDeleteI18n,
  useExportI18n,
  useImportI18n,
  useUpsertI18n,
} from 'src/hooks/api/useAdminI18n';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import type { I18n } from 'src/types/admin-i18n';
import type { TableParamsWithFilters } from 'src/types/table';

type AdminI18nTableParams = TableParamsWithFilters<{
  key?: string;
}>;

export default function AdminI18nPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const canView = hasPermission('I18N.VIEW');
  const canUpdate = hasPermission('I18N.UPDATE');

  const [keyFilter, setKeyFilter] = useState<string | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingI18n, setEditingI18n] = useState<I18n | null>(null);

  const listParams = useMemo(
    () => ({
      key: keyFilter,
    }),
    [keyFilter],
  );

  const {
    i18nEntries,
    pagination,
    isLoading,
    reload,
    goToPage,
    changePageSize,
  } = useAdminI18nPagination({
    initialParams: listParams,
    pageSize: 20,
    autoLoad: true,
  });

  const upsertMutation = useUpsertI18n({
    onSuccess: () => {
      setFormModalOpen(false);
      setEditingI18n(null);
    },
  });

  const deleteMutation = useDeleteI18n({
    onSuccess: () => {
      setSelectedRowKeys([]);
    },
  });

  const exportMutation = useExportI18n();
  const importMutation = useImportI18n({
    onSuccess: () => {
      reload();
    },
  });

  const handleCreate = () => {
    setEditingI18n(null);
    setFormModalOpen(true);
  };

  const handleEdit = (record: I18n) => {
    setEditingI18n(record);
    setFormModalOpen(true);
  };

  const handleDelete = async (record: I18n) => {
    await deleteMutation.mutateAsync([record.id]);
  };

  const handleDeleteSelected = async () => {
    if (selectedRowKeys.length === 0) return;
    await deleteMutation.mutateAsync(selectedRowKeys);
  };

  const handleExport = async () => {
    await exportMutation.mutateAsync(undefined as never);
  };

  const handleImport = async (file: File) => {
    await importMutation.mutateAsync(file);
    return false;
  };

  const rowSelection: TableRowSelection<I18n> = {
    selectedRowKeys,
    onChange: (keys) => {
      setSelectedRowKeys(keys.map(String));
    },
  };

  const columns: ProColumns<I18n>[] = [
    {
      title: t('adminI18nPage.table.key'),
      dataIndex: 'key',
      copyable: true,
      ellipsis: true,
      width: 300,
    },
    {
      title: t('adminI18nPage.table.en'),
      dataIndex: 'en',
      ellipsis: true,
      width: 250,
      render: (_, record) => record.en ?? '-',
    },
    {
      title: t('adminI18nPage.table.vi'),
      dataIndex: 'vi',
      ellipsis: true,
      width: 250,
      render: (_, record) => record.vi ?? '-',
    },
    ...(canUpdate
      ? [
          {
            title: t('common.table.actions'),
            dataIndex: 'actions',
            hideInSearch: true,
            width: 100,
            render: (_: unknown, record: I18n) => (
              <Space size="small">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                />
                <Popconfirm
                  title={t('adminI18nPage.actions.deleteConfirmTitle')}
                  description={t('adminI18nPage.actions.deleteConfirm')}
                  onConfirm={() => handleDelete(record)}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  if (!canView) {
    return null;
  }

  return (
    <AppPage>
      <AppTable<I18n, AdminI18nTableParams>
        rowKey="id"
        columns={columns}
        loading={isLoading}
        dataSource={i18nEntries}
        search={false}
        rowSelection={canUpdate ? rowSelection : undefined}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) =>
            t('adminI18nPage.pagination.total', {
              total,
            }),
          onChange: async (page, pageSize) => {
            if (pageSize && pageSize !== pagination.pageSize) {
              await changePageSize(pageSize);
            } else {
              await goToPage(page);
            }
          },
        }}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={t('adminI18nPage.filters.keyPlaceholder')}
            allowClear
            style={{ width: 300 }}
            value={keyFilter}
            onChange={(e) => setKeyFilter(e.target.value || undefined)}
          />,
          ...(canUpdate
            ? [
                <Button
                  key="create"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreate}
                >
                  {t('adminI18nPage.actions.create')}
                </Button>,
                <ImportExportActions
                  key="import-export"
                  onExport={handleExport}
                  onImport={handleImport}
                  exportLoading={exportMutation.isPending}
                  importLoading={importMutation.isPending}
                  importAccept=".xlsx,.xls"
                  exportLabel={t('common.actions.export')}
                  importLabel={t('common.actions.import')}
                />,
                <Popconfirm
                  key="delete-selected"
                  title={t(
                    'adminI18nPage.actions.deleteSelectedConfirmTitle',
                    'Delete selected translations?',
                  )}
                  description={t(
                    'adminI18nPage.actions.deleteSelectedConfirm',
                    'Are you sure you want to delete {{count}} translation(s)?',
                    { count: selectedRowKeys.length },
                  )}
                  onConfirm={handleDeleteSelected}
                  disabled={selectedRowKeys.length === 0}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    disabled={selectedRowKeys.length === 0}
                  >
                    {t(
                      'adminI18nPage.actions.deleteSelected',
                      'Delete ({{count}})',
                      { count: selectedRowKeys.length },
                    )}
                  </Button>
                </Popconfirm>,
              ]
            : []),
        ]}
      />

      <I18nFormModal
        open={formModalOpen}
        i18nEntry={editingI18n}
        onClose={() => {
          setFormModalOpen(false);
          setEditingI18n(null);
        }}
        onSubmit={async (data) => {
          await upsertMutation.mutateAsync(data);
        }}
        loading={upsertMutation.isPending}
      />
    </AppPage>
  );
}
