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
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import {
  createActionColumn,
  createDateColumn,
  createSearchColumn,
} from 'src/components/common/tableColumns';
import { useAdminTable } from 'src/hooks/admin/useAdminTable';
import { useAdminUsers } from 'src/hooks/api/useAdminUsers';
import { normalizeIds } from 'src/lib/utils/table.utils';
import { adminApiKeyService } from 'src/services/api/admin/api-keys.service';
import type {
  AdminApiKeyListQuery,
  AdminApiKeySummary,
  ApiKeyStatus,
} from 'src/types/admin-api-keys';
import type { TableParamsWithFilters } from 'src/types/table';
import { AdminApiKeyFormModal } from '../components/AdminApiKeyFormModal';
import {
  useAdminApiKeyList,
  useDeleteAdminApiKeys,
  useRegenerateAdminApiKey,
  useRevokeAdminApiKey,
} from '../hooks';
import {
  canRegenerateApiKey,
  canRevokeApiKey,
  formatKeyPrefix,
  getApiKeyStatusColor,
  getApiKeyStatusLabel,
} from '../utils';

type AdminApiKeyTableParams = TableParamsWithFilters<{
  status?: ApiKeyStatus;
  userId?: string;
}>;

const API_KEY_STATUSES: ApiKeyStatus[] = ['active', 'revoked', 'expired'];

export default function AdminApiKeysPage() {
  const { t } = useTranslation();
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [selectedApiKey, setSelectedApiKey] =
    useState<AdminApiKeySummary | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const { data: usersResponse, isLoading: usersLoading } = useAdminUsers({
    take: 1000,
  });

  const { actionRef, canUpdate, request } = useAdminTable<
    AdminApiKeySummary,
    Omit<AdminApiKeyListQuery, 'skip' | 'take'>
  >({
    service: {
      list: async (params) => {
        const response = await adminApiKeyService.list({
          ...params,
          status: params.status,
          userId: params.userId,
        });
        return response;
      },
    },
    permissions: {
      view: 'API_KEY.VIEW',
      update: 'API_KEY.UPDATE',
    },
    normalizeParams: (params) => ({
      status: params.status,
      userId: params.userId,
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
      title: t('common.confirmDelete'),
      content: t('adminApiKeysPage.messages.deleteConfirm'),
      okText: t('common.delete'),
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
      title: t('adminApiKeysPage.messages.revokeTitle'),
      content: t('adminApiKeysPage.messages.revokeConfirm'),
      okText: t('common.confirm'),
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
      title: t('adminApiKeysPage.messages.regenerateTitle'),
      content: t('adminApiKeysPage.messages.regenerateConfirm'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        const result = await regenerateApiKeyMutation.mutateAsync(record.id);
        // Show the new key in a modal
        Modal.info({
          title: t('adminApiKeysPage.messages.regenerateSuccess'),
          content: (
            <div>
              <p>{t('adminApiKeysPage.messages.newKeyWarning')}</p>
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
                  message.success(t('common.copiedToClipboard'));
                }}
                style={{ marginTop: '12px' }}
              >
                {t('common.copy')}
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
    message.success(t('common.copiedToClipboard'));
  };

  const columns: ProColumns<AdminApiKeySummary>[] = [
    createSearchColumn<AdminApiKeySummary>({
      dataIndex: 'search',
      placeholder: t('common.filters.keyword'),
    }),
    {
      title: t('adminApiKeysPage.fields.name'),
      dataIndex: 'name',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: t('adminApiKeysPage.fields.keyPrefix'),
      dataIndex: 'keyPrefix',
      render: (_, record) => (
        <Tooltip title={t('common.clickToCopy')}>
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
    {
      title: t('adminApiKeysPage.fields.user'),
      dataIndex: ['user', 'email'],
      valueType: 'select',
      fieldProps: {
        options: userOptions,
        loading: usersLoading,
      },
      hideInSearch: true,
    },
    {
      title: t('adminApiKeysPage.fields.status'),
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
      title: t('adminApiKeysPage.fields.expiresAt'),
    }),
    createDateColumn<AdminApiKeySummary>({
      dataIndex: 'lastUsedAt',
      title: t('adminApiKeysPage.fields.lastUsedAt'),
    }),
    createDateColumn<AdminApiKeySummary>({
      dataIndex: 'created',
      title: t('common.fields.created'),
    }),
    createActionColumn<AdminApiKeySummary>({
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={t('common.edit')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditApiKey(record)}
              disabled={!canUpdate}
            />
          </Tooltip>
          {canRevokeApiKey(record.status) && (
            <Tooltip title={t('adminApiKeysPage.actions.revoke')}>
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
            <Tooltip title={t('adminApiKeysPage.actions.regenerate')}>
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => handleRegenerateApiKey(record)}
                disabled={!canUpdate}
              />
            </Tooltip>
          )}
          <Tooltip title={t('common.delete')}>
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
    }),
  ];

  return (
    <AppPage
      title={t('adminApiKeysPage.title')}
      subtitle={t('adminApiKeysPage.subtitle')}
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateApiKey}
            disabled={!canUpdate}
          >
            {t('adminApiKeysPage.actions.create')}
          </Button>
        </Space>
      }
    >
      <AppTable<AdminApiKeySummary, AdminApiKeyTableParams>
        actionRef={actionRef}
        columns={columns}
        request={request}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        tableAlertRender={
          selectedRowKeys.length > 0
            ? {
                title: t('common.selected', {
                  count: selectedRowKeys.length,
                }),
                option: (
                  <Space size="small">
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() =>
                        handleDeleteApiKeys(selectedRowKeys as string[])
                      }
                    >
                      {t('common.deleteSelected')}
                    </Button>
                  </Space>
                ),
              }
            : undefined
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
