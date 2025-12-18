import { CopyOutlined } from '@ant-design/icons';
import {
  ProForm,
  ProFormDateTimePicker,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Button, Form, Modal, message, Space } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppModal } from 'src/components/common/AppModal';
import { useAppMutation } from 'src/hooks/api/useMutation';
import { toIsoStringOrNull } from 'src/lib/utils/date.utils';
import { apiKeyService } from 'src/services/api/api-keys.service';
import type {
  UserApiKeyCreatePayload,
  UserApiKeyCreateResponse,
  UserApiKeySummary,
  UserApiKeyUpdatePayload,
} from 'src/types/admin-api-keys';

interface UserApiKeyFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: UserApiKeySummary | null;
}

interface FormValues {
  name: string;
  expiresAt?: dayjs.Dayjs | null;
  permissions?: string[];
  ipWhitelist?: string;
}

export function UserApiKeyFormModal({
  visible,
  onClose,
  onSuccess,
  initialData,
}: UserApiKeyFormModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<FormValues>();
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKey, setNewKey] = useState<UserApiKeyCreateResponse | null>(null);

  const createMutation = useAppMutation({
    mutationFn: (payload: UserApiKeyCreatePayload) =>
      apiKeyService.create(payload),
    invalidateKeys: [],
    successMessageKey: 'apiKeysPage.messages.createSuccess',
    successMessageDefault: 'API key created successfully',
    errorMessageKey: 'apiKeysPage.messages.createError',
    errorMessageDefault: 'Failed to create API key',
  });

  const updateMutation = useAppMutation({
    mutationFn: ({
      apiKeyId,
      payload,
    }: {
      apiKeyId: string;
      payload: UserApiKeyUpdatePayload;
    }) => apiKeyService.update(apiKeyId, payload),
    invalidateKeys: [],
    successMessageKey: 'apiKeysPage.messages.updateSuccess',
    successMessageDefault: 'API key updated successfully',
    errorMessageKey: 'apiKeysPage.messages.updateError',
    errorMessageDefault: 'Failed to update API key',
  });

  const isEditMode = !!initialData;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (visible && initialData) {
      form.setFieldsValue({
        name: initialData.name,
        expiresAt: initialData.expiresAt
          ? dayjs(initialData.expiresAt)
          : undefined,
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, initialData, form]);

  const handleSubmit = async (values: FormValues) => {
    try {
      if (isEditMode && initialData) {
        // Update mode
        const payload: UserApiKeyUpdatePayload = {
          name: values.name,
          expiresAt: toIsoStringOrNull(values.expiresAt),
          permissions: values.permissions,
          ipWhitelist: values.ipWhitelist
            ? values.ipWhitelist.split('\n').filter((ip) => ip.trim())
            : undefined,
        };
        await updateMutation.mutateAsync({
          apiKeyId: initialData.id,
          payload,
        });
        onSuccess();
      } else {
        // Create mode
        const payload: UserApiKeyCreatePayload = {
          name: values.name,
          expiresAt: toIsoStringOrNull(values.expiresAt),
          permissions: values.permissions,
          ipWhitelist: values.ipWhitelist
            ? values.ipWhitelist.split('\n').filter((ip) => ip.trim())
            : undefined,
        };

        const result = await createMutation.mutateAsync(payload);
        setNewKey(result);
        setShowKeyModal(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const handleCopyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey.key);
      message.success(t('common.messages.copiedToClipboard'));
    }
  };

  const handleKeyModalClose = () => {
    setShowKeyModal(false);
    setNewKey(null);
    onSuccess();
  };

  return (
    <>
      <AppModal
        open={visible}
        onCancel={handleCancel}
        title={
          isEditMode
            ? t('apiKeysPage.actions.edit')
            : t('apiKeysPage.actions.create')
        }
        width={600}
        footer={
          <Space>
            <Button onClick={handleCancel} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
            <Button
              type="primary"
              onClick={() => form.submit()}
              loading={isLoading}
            >
              {isEditMode ? t('common.save') : t('common.actions.create')}
            </Button>
          </Space>
        }
      >
        <ProForm<FormValues>
          form={form}
          disabled={isLoading}
          submitter={false}
          onFinish={handleSubmit}
          layout="vertical"
        >
          <ProFormText
            name="name"
            label={t('apiKeysPage.fields.name')}
            placeholder={t('apiKeysPage.placeholders.keyName')}
            rules={[
              {
                required: true,
                message: t('apiKeysPage.messages.nameRequired'),
              },
              {
                max: 255,
                message: t('common.validation.maxLength', { max: 255 }),
              },
            ]}
          />

          <ProFormDateTimePicker
            name="expiresAt"
            label={t('apiKeysPage.fields.expiresAt')}
            placeholder={t('apiKeysPage.placeholders.expiresAt')}
            fieldProps={{
              showTime: true,
            }}
          />

          <ProFormTextArea
            name="ipWhitelist"
            label={t('apiKeysPage.fields.ipWhitelist')}
            placeholder={t('apiKeysPage.placeholders.ipWhitelist')}
            fieldProps={{
              rows: 4,
            }}
            tooltip={t('apiKeysPage.tooltips.ipWhitelist')}
          />
        </ProForm>
      </AppModal>

      {/* Modal hiển thị key mới */}
      <Modal
        open={showKeyModal}
        title={t('apiKeysPage.messages.newKeyTitle')}
        onCancel={handleKeyModalClose}
        footer={[
          <Button key="close" type="primary" onClick={handleKeyModalClose}>
            {t('common.actions.close')}
          </Button>,
        ]}
      >
        <div style={{ marginBottom: '16px' }}>
          <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
            {t('apiKeysPage.messages.newKeyWarning')}
          </p>
          <p>{t('apiKeysPage.messages.newKeyDescription')}</p>
        </div>

        <div
          style={{
            background: '#f5f5f5',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '12px',
            wordBreak: 'break-all',
            fontFamily: 'monospace',
            fontSize: '12px',
          }}
        >
          {newKey?.key}
        </div>

        <Button
          type="primary"
          icon={<CopyOutlined />}
          onClick={handleCopyKey}
          block
        >
          {t('common.actions.copy')}
        </Button>
      </Modal>
    </>
  );
}
