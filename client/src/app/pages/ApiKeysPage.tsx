import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Modal, message, Space, Tag, Tooltip } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import {
  createDateColumn,
  createSearchColumn,
} from 'src/components/common/tableColumns';
import { AdminApiKeyFormModal } from 'src/features/admin/api-keys/components/AdminApiKeyFormModal';
import {
  useDeleteAdminApiKeys,
  useRegenerateAdminApiKey,
  useRevokeAdminApiKey,
} from 'src/features/admin/api-keys/hooks';
import {
  canRegenerateApiKey,
  canRevokeApiKey,
  formatKeyPrefix,
  getApiKeyStatusColor,
  getApiKeyStatusLabel,
} from 'src/features/admin/api-keys/utils';
import { useAdminTable } from 'src/hooks/admin/useAdminTable';
import { useAdminUsers } from 'src/hooks/api/useAdminUsers';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import { adminApiKeyService } from 'src/services/api/admin/api-keys.service';
import type {
  AdminApiKeyListQuery,
  AdminApiKeySummary,
  ApiKeyStatus,
} from 'src/types/admin-api-keys';
import type { TableParamsWithFilters } from 'src/types/table';

type ApiKeyTableParams = TableParamsWithFilters<{
  status?: ApiKeyStatus;
  userId?: string;
}>;

const API_KEY_STATUSES: ApiKeyStatus[] = ['active', 'revoked', 'expired'];

export default function ApiKeysPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [selectedApiKey, setSelectedApiKey] =
    useState<AdminApiKeySummary | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const canViewAll = hasPermission('API_KEY.VIEW_ALL');
  const canUpdate = hasPermission('API_KEY.UPDATE');

  const { data: usersResponse, isLoading: usersLoading } = useAdminUsers({
    take: 1000,
  });

  const { actionRef, request } = useAdminTable<
    AdminApiKeySummary,
    Omit<AdminApiKeyListQuery, 'skip' | 'take'>
  >({
    service: {
      list: async (params) => {
        const response = await adminApiKeyService.list({
          ...params,
          status: params.status,
          userId: canViewAll ? params.userId : undefined,
        });
        return response;
      },
    },
    permissions: {
      view: ['API_KEY.VIEW', 'API_KEY.VIEW_ALL'],
      update: 'API_KEY.UPDATE',
    },
    normalizeParams: (params) => ({
      status: params.status,
      userId: canViewAll ? params.userId : undefined,
      search: params.search,
    }),
  });

  const deleteApiKeysMutation = useDeleteAdminApiKeys();
  const revokeApiKeyMutation = useRevokeAdminApiKey();
  const regenerateApiKeyMutation = useRegenerateAdminApiKey();

  const userOptions = useMemo(
    () =>
      (usersResponse?.docs ?? []).map((user) => ({
        label: user.email,
        value: user.id,
      })),
    [usersResponse],
  );

  const handleCreateApiKey = () => {
    setSelectedApiKey(null);
    setIsFormModalVisible(true);
  };

  const handleEditApiKey = (record: AdminApiKeySummary) => {
    setSelectedApiKey(record);
    setIsFormModalVisible(true);
  };

  const handleDeleteApiKeys = (ids: string[]) => {
    Modal.confirm({
      title: t('common.messages.confirmDelete'),
      content: t('apiKeysPage.messages.deleteConfirm'),
      okText: t('common.actions.delete'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteApiKeysMutation.mutateAsync(ids);
        setSelectedRowKeys([]);
        actionRef.current?.reload();
      },
    });
  };

  const handleRevokeApiKey = (record: AdminApiKeySummary) => {
    Modal.confirm({
      title: t('apiKeysPage.messages.revokeTitle'),
      content: t('apiKeysPage.messages.revokeConfirm'),
      okText: t('common.actions.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        await revokeApiKeyMutation.mutateAsync(record.id);
        actionRef.current?.reload();
      },
    });
  };

  const handleRegenerateApiKey = (record: AdminApiKeySummary) => {
    Modal.confirm({
      title: t('apiKeysPage.messages.regenerateTitle'),
      content: t('apiKeysPage.messages.regenerateConfirm'),
      okText: t('common.actions.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        const result = await regenerateApiKeyMutation.mutateAsync(record.id);
        Modal.info({
          title: t('apiKeysPage.messages.regenerateSuccess'),
          content: (
            <div>
              <p>{t('apiKeysPage.messages.newKeyWarning')}</p>
              <div
                style={{
                  background: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '4px',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                }}
              >
                {result.key}
              </div>
              <Button
                type="primary"
                onClick={() => {
                  navigator.clipboard.writeText(result.key);
                  message.success(t('common.messages.copiedToClipboard'));
                }}
                style={{ marginTop: '12px' }}
              >
                {t('common.actions.copy')}
              </Button>
            </div>
          ),
        });
        actionRef.current?.reload();
      },
    });
  };

  const handleCopyKey = (keyPrefix: string) => {
    navigator.clipboard.writeText(keyPrefix);
    message.success(t('common.messages.copiedToClipboard'));
  };

  const columns: ProColumns<AdminApiKeySummary>[] = [
    createSearchColumn<AdminApiKeySummary>({
      dataIndex: 'search',
      placeholder: t('common.filters.keyword'),
    }),
    {
      title: t('apiKeysPage.fields.name'),
      dataIndex: 'name',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: t('apiKeysPage.fields.keyPrefix'),
      dataIndex: 'keyPrefix',
      render: (_, record) => (
        <Tooltip title={t('common.placeholders.clickToCopy')}>
          <span
            onClick={() => handleCopyKey(record.keyPrefix)}
            style={{ cursor: 'pointer', color: '#1890ff' }}
          >
            <CopyOutlined /> {formatKeyPrefix(record.keyPrefix)}
          </span>
        </Tooltip>
      ),
      hideInSearch: true,
    },
    ...(canViewAll
      ? [
          {
            title: t('adminApiKeysPage.fields.user'),
            dataIndex: ['user', 'email'],
            valueType: 'select',
            fieldProps: {
              options: userOptions,
              loading: usersLoading,
            },
            hideInSearch: true,
          } as ProColumns<AdminApiKeySummary>,
        ]
      : []),
    {
      title: t('apiKeysPage.fields.status'),
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      fieldProps: {
        options: API_KEY_STATUSES.map((status) => ({
          label: getApiKeyStatusLabel(status),
          value: status,
        })),
      },
      render: (_, record) => (
        <Tag color={getApiKeyStatusColor(record.status)}>
          {getApiKeyStatusLabel(record.status)}
        </Tag>
      ),
    },
    createDateColumn<AdminApiKeySummary>({
      dataIndex: 'expiresAt',
      title: t('apiKeysPage.fields.expiresAt'),
    }),
    createDateColumn<AdminApiKeySummary>({
      dataIndex: 'lastUsedAt',
      title: t('apiKeysPage.fields.lastUsedAt'),
    }),
    createDateColumn<AdminApiKeySummary>({
      dataIndex: 'created',
      title: t('common.fields.created'),
    }),
    {
      title: t('common.fields.actions'),
      dataIndex: 'actions',
      valueType: 'option',
      width: 200,
      fixed: 'right',
      hideInSearch: true,
      render: (_: unknown, record: AdminApiKeySummary) => (
        <Space size="small">
          <Tooltip title={t('common.actions.edit')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditApiKey(record)}
              disabled={!canUpdate}
            />
          </Tooltip>
          {canRevokeApiKey(record.status) && (
            <Tooltip title={t('apiKeysPage.actions.revoke')}>
              <Button
                type="text"
                size="small"
                icon={<LockOutlined />}
                onClick={() => handleRevokeApiKey(record)}
                disabled={!canUpdate}
              />
            </Tooltip>
          )}
          {canRegenerateApiKey(record.status) && (
            <Tooltip title={t('apiKeysPage.actions.regenerate')}>
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => handleRegenerateApiKey(record)}
                disabled={!canUpdate}
              />
            </Tooltip>
          )}
          <Tooltip title={t('common.actions.delete')}>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteApiKeys([record.id])}
              disabled={!canUpdate}
            />
          </Tooltip>
        </Space>
      ),
    } as ProColumns<AdminApiKeySummary>,
  ];

  return (
    <AppPage
      title={t('adminApiKeysPage.title')}
      subtitle={t('adminApiKeysPage.subtitle')}
      extra={
        <Space>
          {canUpdate && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateApiKey}
            >
              {t('apiKeysPage.actions.create')}
            </Button>
          )}
        </Space>
      }
    >
      <AppTable<AdminApiKeySummary, ApiKeyTableParams>
        actionRef={actionRef}
        columns={columns}
        request={request}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as string[]),
        }}
        tableAlertRender={
          selectedRowKeys.length > 0
            ? ({ onCleanSelected }) => {
                return {
                  title: t('common.messages.selected', {
                    count: selectedRowKeys.length,
                  }),
                  option: (
                    <Space size="small">
                      <Button
                        type="link"
                        size="small"
                        danger
                        onClick={() => {
                          handleDeleteApiKeys(selectedRowKeys);
                          onCleanSelected();
                        }}
                      >
                        {t('common.actions.deleteSelected')}
                      </Button>
                    </Space>
                  ),
                } as any;
              }
            : false
        }
      />

      <AdminApiKeyFormModal
        visible={isFormModalVisible}
        onClose={() => setIsFormModalVisible(false)}
        onSuccess={() => {
          setIsFormModalVisible(false);
          actionRef.current?.reload();
        }}
        initialData={selectedApiKey}
        userOptions={userOptions}
      />
    </AppPage>
  );
}
