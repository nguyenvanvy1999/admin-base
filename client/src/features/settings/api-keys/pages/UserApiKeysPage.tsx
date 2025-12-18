import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { Button, Modal, message, Space, Tag, Tooltip } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import {
  createDateColumn,
  createSearchColumn,
} from 'src/components/common/tableColumns';
import { useAppMutation } from 'src/hooks/api/useMutation';
import { apiKeyKeys, apiKeyService } from 'src/services/api/api-keys.service';
import type {
  ApiKeyStatus,
  UserApiKeyListQuery,
  UserApiKeySummary,
} from 'src/types/admin-api-keys';
import type { TableParamsWithFilters } from 'src/types/table';
import {
  canRegenerateApiKey,
  canRevokeApiKey,
  formatKeyPrefix,
  getApiKeyStatusColor,
  getApiKeyStatusLabel,
} from '../../../admin/api-keys/utils';
import { UserApiKeyFormModal } from '../components/UserApiKeyFormModal';

type UserApiKeyTableParams = TableParamsWithFilters<{
  status?: ApiKeyStatus;
}>;

const API_KEY_STATUSES: ApiKeyStatus[] = ['active', 'revoked', 'expired'];

function useUserApiKeyList(query?: UserApiKeyListQuery, enabled = true) {
  return useQuery({
    queryKey: apiKeyKeys.list(query),
    queryFn: () => apiKeyService.list(query),
    enabled,
  });
}

function useDeleteUserApiKeys() {
  return useAppMutation({
    mutationFn: (ids: string[]) => apiKeyService.delete(ids),
    invalidateKeys: [apiKeyKeys.lists()],
    successMessageKey: 'apiKeysPage.messages.deleteSuccess',
    successMessageDefault: 'API keys deleted successfully',
    errorMessageKey: 'apiKeysPage.messages.deleteError',
    errorMessageDefault: 'Failed to delete API keys',
  });
}

function useRevokeUserApiKey() {
  return useAppMutation({
    mutationFn: (apiKeyId: string) => apiKeyService.revoke(apiKeyId),
    invalidateKeys: [apiKeyKeys.lists()],
    successMessageKey: 'apiKeysPage.messages.revokeSuccess',
    successMessageDefault: 'API key revoked successfully',
    errorMessageKey: 'apiKeysPage.messages.revokeError',
    errorMessageDefault: 'Failed to revoke API key',
  });
}

function useRegenerateUserApiKey() {
  return useAppMutation({
    mutationFn: (apiKeyId: string) => apiKeyService.regenerate(apiKeyId),
    invalidateKeys: [apiKeyKeys.lists()],
    successMessageKey: 'apiKeysPage.messages.regenerateSuccess',
    successMessageDefault: 'API key regenerated successfully',
    errorMessageKey: 'apiKeysPage.messages.regenerateError',
    errorMessageDefault: 'Failed to regenerate API key',
  });
}

export default function UserApiKeysPage() {
  const { t } = useTranslation();
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [selectedApiKey, setSelectedApiKey] =
    useState<UserApiKeySummary | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const { data: apiKeysResponse, isLoading } = useUserApiKeyList();

  const deleteApiKeysMutation = useDeleteUserApiKeys();
  const revokeApiKeyMutation = useRevokeUserApiKey();
  const regenerateApiKeyMutation = useRegenerateUserApiKey();

  const handleCreateApiKey = () => {
    setSelectedApiKey(null);
    setIsFormModalVisible(true);
  };

  const handleEditApiKey = (record: UserApiKeySummary) => {
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
      },
    });
  };

  const handleRevokeApiKey = (record: UserApiKeySummary) => {
    Modal.confirm({
      title: t('apiKeysPage.messages.revokeTitle'),
      content: t('apiKeysPage.messages.revokeConfirm'),
      okText: t('common.actions.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        await revokeApiKeyMutation.mutateAsync(record.id);
      },
    });
  };

  const handleRegenerateApiKey = (record: UserApiKeySummary) => {
    Modal.confirm({
      title: t('apiKeysPage.messages.regenerateTitle'),
      content: t('apiKeysPage.messages.regenerateConfirm'),
      okText: t('common.actions.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        const result = await regenerateApiKeyMutation.mutateAsync(record.id);
        // Show the new key in a modal
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
      },
    });
  };

  const handleCopyKey = (keyPrefix: string) => {
    navigator.clipboard.writeText(keyPrefix);
    message.success(t('common.messages.copiedToClipboard'));
  };

  const columns: ProColumns<UserApiKeySummary>[] = [
    createSearchColumn<UserApiKeySummary>({
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
    createDateColumn<UserApiKeySummary>({
      dataIndex: 'expiresAt',
      title: t('apiKeysPage.fields.expiresAt'),
    }),
    createDateColumn<UserApiKeySummary>({
      dataIndex: 'lastUsedAt',
      title: t('apiKeysPage.fields.lastUsedAt'),
    }),
    createDateColumn<UserApiKeySummary>({
      dataIndex: 'created',
      title: t('common.fields.created'),
    }),
    {
      title: t('common.fields.actions'),
      dataIndex: 'actions',
      valueType: 'option',
      width: 150,
      fixed: 'right',
      hideInSearch: true,
      render: (_: unknown, record: UserApiKeySummary) => (
        <Space size="small">
          <Tooltip title={t('common.actions.edit')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditApiKey(record)}
            />
          </Tooltip>
          {canRevokeApiKey(record.status) && (
            <Tooltip title={t('apiKeysPage.actions.revoke')}>
              <Button
                type="text"
                size="small"
                icon={<LockOutlined />}
                onClick={() => handleRevokeApiKey(record)}
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
            />
          </Tooltip>
        </Space>
      ),
    } as ProColumns<UserApiKeySummary>,
  ];

  return (
    <AppPage
      title={t('userApiKeysPage.title')}
      subtitle={t('userApiKeysPage.subtitle')}
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateApiKey}
          >
            {t('apiKeysPage.actions.create')}
          </Button>
        </Space>
      }
    >
      <AppTable<UserApiKeySummary, UserApiKeyTableParams>
        columns={columns}
        dataSource={apiKeysResponse?.docs ?? []}
        loading={isLoading}
        rowKey="id"
        pagination={{
          total: apiKeysResponse?.count ?? 0,
          pageSize: 20,
        }}
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

      <UserApiKeyFormModal
        visible={isFormModalVisible}
        onClose={() => setIsFormModalVisible(false)}
        onSuccess={() => {
          setIsFormModalVisible(false);
        }}
        initialData={selectedApiKey}
      />
    </AppPage>
  );
}
