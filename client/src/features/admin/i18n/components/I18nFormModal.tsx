import { Form, Input, Modal } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { I18n, I18nUpsertDto } from 'src/types/admin-i18n';

interface I18nFormModalProps {
  open: boolean;
  i18nEntry: I18n | null;
  onClose: () => void;
  onSubmit: (data: I18nUpsertDto) => Promise<void>;
  loading?: boolean;
}

export function I18nFormModal({
  open,
  i18nEntry,
  onClose,
  onSubmit,
  loading = false,
}: I18nFormModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<I18nUpsertDto>();

  const isEditMode = !!i18nEntry;

  useEffect(() => {
    if (open && i18nEntry) {
      form.setFieldsValue({
        key: i18nEntry.key,
        en: i18nEntry.en,
        vi: i18nEntry.vi,
      });
    } else if (open && !i18nEntry) {
      form.resetFields();
    }
  }, [open, i18nEntry, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit({
        ...values,
        id: i18nEntry?.id,
      });
      form.resetFields();
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        isEditMode
          ? t('adminI18nPage.form.editTitle', 'Edit Translation')
          : t('adminI18nPage.form.createTitle', 'Create Translation')
      }
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText={t('common.actions.save', 'Save')}
      cancelText={t('common.actions.cancel', 'Cancel')}
      width={600}
    >
      <Form form={form} layout="vertical" autoComplete="off" disabled={loading}>
        <Form.Item
          label={t('adminI18nPage.form.key', 'Key')}
          name="key"
          rules={[
            {
              required: true,
              message: t(
                'adminI18nPage.form.keyRequired',
                'Please enter a key',
              ),
            },
          ]}
        >
          <Input
            placeholder={t(
              'adminI18nPage.form.keyPlaceholder',
              'e.g. common.actions.save',
            )}
            disabled={isEditMode}
          />
        </Form.Item>

        <Form.Item
          label={t('adminI18nPage.form.en', 'English Translation')}
          name="en"
        >
          <Input.TextArea
            rows={3}
            placeholder={t(
              'adminI18nPage.form.enPlaceholder',
              'Enter English translation',
            )}
          />
        </Form.Item>

        <Form.Item
          label={t('adminI18nPage.form.vi', 'Vietnamese Translation')}
          name="vi"
        >
          <Input.TextArea
            rows={3}
            placeholder={t(
              'adminI18nPage.form.viPlaceholder',
              'Enter Vietnamese translation',
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
