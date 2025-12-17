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
} from '../../admin/api-keys/utils';
import { UserApiKeyFormModal } from '../components/UserApiKeyFormModal';

type UserApiKeyTableParams = TableParamsWithFilters<{
  status?: ApiKeyStatus;
}>;

const API_KEY_STATUSES: ApiKeyStatus[] = ['active', 'revoked', 'expired'];

/**
 * Hook để lấy danh sách API keys của user hiện tại
 */
function useUserApiKeyList(query?: UserApiKeyListQuery, enabled = true) {
  return useQuery({
    queryKey: apiKeyKeys.list(query),
    queryFn: () => apiKeyService.list(query),
    enabled,
  });
}

/**
 * Hook để xóa API keys
 */
function useDeleteUserApiKeys() {
  return useAppMutation({
    mutationFn: (ids: string[]) => apiKeyService.delete(ids),
    invalidateKeys: [apiKeyKeys.lists()],
    successMessageKey: 'userApiKeysPage.messages.deleteSuccess',
    successMessageDefault: 'API keys deleted successfully',
    errorMessageKey: 'userApiKeysPage.messages.deleteError',
    errorMessageDefault: 'Failed to delete API keys',
  });
}

/**
 * Hook để revoke API key
 */
function useRevokeUserApiKey() {
  return useAppMutation({
    mutationFn: (apiKeyId: string) => apiKeyService.revoke(apiKeyId),
    invalidateKeys: [apiKeyKeys.lists()],
    successMessageKey: 'userApiKeysPage.messages.revokeSuccess',
    successMessageDefault: 'API key revoked successfully',
    errorMessageKey: 'userApiKeysPage.messages.revokeError',
    errorMessageDefault: 'Failed to revoke API key',
  });
}

/**
 * Hook để regenerate API key
 */
function useRegenerateUserApiKey() {
  return useAppMutation({
    mutationFn: (apiKeyId: string) => apiKeyService.regenerate(apiKeyId),
    invalidateKeys: [apiKeyKeys.lists()],
    successMessageKey: 'userApiKeysPage.messages.regenerateSuccess',
    successMessageDefault: 'API key regenerated successfully',
    errorMessageKey: 'userApiKeysPage.messages.regenerateError',
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
      title: t('common.confirmDelete'),
      content: t('userApiKeysPage.messages.deleteConfirm'),
      okText: t('common.delete'),
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
      title: t('userApiKeysPage.messages.revokeTitle'),
      content: t('userApiKeysPage.messages.revokeConfirm'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        await revokeApiKeyMutation.mutateAsync(record.id);
      },
    });
  };

  const handleRegenerateApiKey = (record: UserApiKeySummary) => {
    Modal.confirm({
      title: t('userApiKeysPage.messages.regenerateTitle'),
      content: t('userApiKeysPage.messages.regenerateConfirm'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        const result = await regenerateApiKeyMutation.mutateAsync(record.id);
        // Show the new key in a modal
        Modal.info({
          title: t('userApiKeysPage.messages.regenerateSuccess'),
          content: (
            <div>
              <p>{t('userApiKeysPage.messages.newKeyWarning')}</p>
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
      },
    });
  };

  const handleCopyKey = (keyPrefix: string) => {
    navigator.clipboard.writeText(keyPrefix);
    message.success(t('common.copiedToClipboard'));
  };

  const columns: ProColumns<UserApiKeySummary>[] = [
    createSearchColumn<UserApiKeySummary>({
      dataIndex: 'search',
      placeholder: t('common.filters.keyword'),
    }),
    {
      title: t('userApiKeysPage.fields.name'),
      dataIndex: 'name',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: t('userApiKeysPage.fields.keyPrefix'),
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
      title: t('userApiKeysPage.fields.status'),
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
      title: t('userApiKeysPage.fields.expiresAt'),
    }),
    createDateColumn<UserApiKeySummary>({
      dataIndex: 'lastUsedAt',
      title: t('userApiKeysPage.fields.lastUsedAt'),
    }),
    createDateColumn<UserApiKeySummary>({
      dataIndex: 'created',
      title: t('common.fields.created'),
    }),
    createActionColumn<UserApiKeySummary>({
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={t('common.edit')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditApiKey(record)}
            />
          </Tooltip>
          {canRevokeApiKey(record.status) && (
            <Tooltip title={t('userApiKeysPage.actions.revoke')}>
              <Button
                type="text"
                size="small"
                icon={<LockOutlined />}
                onClick={() => handleRevokeApiKey(record)}
              />
            </Tooltip>
          )}
          {canRegenerateApiKey(record.status) && (
            <Tooltip title={t('userApiKeysPage.actions.regenerate')}>
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => handleRegenerateApiKey(record)}
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
            />
          </Tooltip>
        </Space>
      ),
    }),
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
            {t('userApiKeysPage.actions.create')}
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
