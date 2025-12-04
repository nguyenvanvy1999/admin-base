import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Input, Popconfirm, Space } from 'antd';
import type { TableRowSelection } from 'antd/es/table/interface';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import { UserIpWhitelistFormModal } from 'src/features/admin/user-ip-whitelists/components/UserIpWhitelistFormModal';
import { useAdminUserIpWhitelistPagination } from 'src/features/admin/user-ip-whitelists/hooks/useAdminUserIpWhitelistPagination';
import {
  useDeleteUserIpWhitelists,
  useUpsertUserIpWhitelist,
} from 'src/hooks/api/useAdminUserIpWhitelist';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import type { UserIpWhitelist } from 'src/types/admin-user-ip-whitelist';
import type { TableParamsWithFilters } from 'src/types/table';

type AdminUserIpWhitelistTableParams = TableParamsWithFilters<{
  userIds?: string;
  ip?: string;
}>;

export default function AdminUserIpWhitelistPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const canView = hasPermission('IPWHITELIST.VIEW');
  const canUpdate = hasPermission('IPWHITELIST.UPDATE');

  const [userIdsFilter, setUserIdsFilter] = useState<string | undefined>(
    undefined,
  );
  const [ipFilter, setIpFilter] = useState<string | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<UserIpWhitelist | null>(
    null,
  );

  const listParams = useMemo(
    () => ({
      userIds: userIdsFilter,
      ip: ipFilter,
    }),
    [userIdsFilter, ipFilter],
  );

  const { entries, pagination, isLoading, reload, goToPage, changePageSize } =
    useAdminUserIpWhitelistPagination({
      initialParams: listParams,
      pageSize: 20,
      autoLoad: true,
    });

  const upsertMutation = useUpsertUserIpWhitelist({
    onSuccess: () => {
      setFormModalOpen(false);
      setEditingEntry(null);
      reload();
    },
  });

  const deleteMutation = useDeleteUserIpWhitelists({
    onSuccess: () => {
      setSelectedRowKeys([]);
      reload();
    },
  });

  const handleCreate = () => {
    setEditingEntry(null);
    setFormModalOpen(true);
  };

  const handleEdit = (record: UserIpWhitelist) => {
    setEditingEntry(record);
    setFormModalOpen(true);
  };

  const handleDelete = async (record: UserIpWhitelist) => {
    await deleteMutation.mutateAsync([record.id]);
  };

  const handleDeleteSelected = async () => {
    if (selectedRowKeys.length === 0) return;
    await deleteMutation.mutateAsync(selectedRowKeys);
  };

  const rowSelection: TableRowSelection<UserIpWhitelist> = {
    selectedRowKeys,
    onChange: (keys) => {
      setSelectedRowKeys(keys.map(String));
    },
  };

  const columns: ProColumns<UserIpWhitelist>[] = [
    {
      title: t('adminUserIpWhitelistPage.table.userId', 'User ID'),
      dataIndex: 'userId',
      copyable: true,
      ellipsis: true,
      width: 250,
    },
    {
      title: t('adminUserIpWhitelistPage.table.ip', 'IP Address'),
      dataIndex: 'ip',
      copyable: true,
      width: 200,
    },
    {
      title: t('common.table.created', 'Created at'),
      dataIndex: 'created',
      valueType: 'dateTime',
      width: 180,
    },
    ...(canUpdate
      ? [
          {
            title: t('common.table.actions', 'Actions'),
            dataIndex: 'actions',
            hideInSearch: true,
            width: 100,
            render: (_: unknown, record: UserIpWhitelist) => (
              <Space size="small">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                />
                <Popconfirm
                  title={t(
                    'adminUserIpWhitelistPage.actions.deleteConfirmTitle',
                    'Delete IP whitelist?',
                  )}
                  description={t(
                    'adminUserIpWhitelistPage.actions.deleteConfirm',
                    'Are you sure you want to delete this IP whitelist entry?',
                  )}
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
      <AppTable<UserIpWhitelist, AdminUserIpWhitelistTableParams>
        rowKey="id"
        columns={columns}
        loading={isLoading}
        dataSource={entries}
        search={false}
        rowSelection={canUpdate ? rowSelection : undefined}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) =>
            t(
              'adminUserIpWhitelistPage.pagination.total',
              '{{total}} entries',
              {
                total,
              },
            ),
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
            key="userIds"
            placeholder={t(
              'adminUserIpWhitelistPage.filters.userIdsPlaceholder',
              'Filter by user IDs (comma-separated)',
            )}
            allowClear
            style={{ width: 300 }}
            value={userIdsFilter}
            onChange={(e) => setUserIdsFilter(e.target.value || undefined)}
          />,
          <Input.Search
            key="ip"
            placeholder={t(
              'adminUserIpWhitelistPage.filters.ipPlaceholder',
              'Filter by IP address',
            )}
            allowClear
            style={{ width: 250 }}
            value={ipFilter}
            onChange={(e) => setIpFilter(e.target.value || undefined)}
          />,
          ...(canUpdate
            ? [
                <Button
                  key="create"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreate}
                >
                  {t('adminUserIpWhitelistPage.actions.create', 'Create')}
                </Button>,
                <Popconfirm
                  key="delete-selected"
                  title={t(
                    'adminUserIpWhitelistPage.actions.deleteSelectedConfirmTitle',
                    'Delete selected entries?',
                  )}
                  description={t(
                    'adminUserIpWhitelistPage.actions.deleteSelectedConfirm',
                    'Are you sure you want to delete {{count}} entry(s)?',
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
                      'adminUserIpWhitelistPage.actions.deleteSelected',
                      'Delete ({{count}})',
                      { count: selectedRowKeys.length },
                    )}
                  </Button>
                </Popconfirm>,
              ]
            : []),
        ]}
      />

      <UserIpWhitelistFormModal
        open={formModalOpen}
        entry={editingEntry}
        onClose={() => {
          setFormModalOpen(false);
          setEditingEntry(null);
        }}
        onSubmit={async (data) => {
          await upsertMutation.mutateAsync(data);
        }}
        loading={upsertMutation.isPending}
      />
    </AppPage>
  );
}
