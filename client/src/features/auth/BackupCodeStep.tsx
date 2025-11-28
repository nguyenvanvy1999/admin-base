import { ProForm, ProFormText } from '@ant-design/pro-components';
import { Alert, Button, Form, Typography } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface BackupFormValues {
  code: string;
}

interface BackupCodeStepProps {
  loading?: boolean;
  serverError?: string;
  isLocked?: boolean;
  onSubmit: (code: string) => void;
  onBackToOtp?: () => void;
}

export function BackupCodeStep({
  loading,
  serverError,
  isLocked,
  onSubmit,
  onBackToOtp,
}: BackupCodeStepProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<BackupFormValues>();

  useEffect(() => {
    form.setFieldsValue({ code: '' });
  }, [form]);

  return (
    <ProForm<BackupFormValues>
      form={form}
      layout="vertical"
      submitter={{
        searchConfig: { submitText: t('auth.backup.cta') },
        submitButtonProps: {
          block: true,
          size: 'large',
          loading,
          disabled: isLocked,
        },
      }}
      onFinish={(values) => {
        onSubmit(values.code);
        return Promise.resolve(true);
      }}
    >
      <Typography.Title level={4} style={{ marginBottom: 4 }}>
        {t('auth.backup.title')}
      </Typography.Title>
      <Typography.Text type="secondary">
        {t('auth.backup.subtitle')}
      </Typography.Text>

      {serverError && (
        <Alert
          type="error"
          title={serverError}
          showIcon
          closable
          style={{ marginTop: 16 }}
        />
      )}

      {isLocked && (
        <Alert
          type="warning"
          title={t('auth.backup.locked')}
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      <ProFormText
        name="code"
        label={t('auth.backup.codeLabel')}
        placeholder={t('auth.backup.placeholder')}
        fieldProps={{ size: 'large', autoFocus: true, disabled: isLocked }}
        rules={[
          {
            required: true,
            message: t('auth.backup.codeRequired'),
          },
          {
            len: 8,
            message: t('auth.backup.codeInvalid'),
          },
        ]}
      />

      <Button type="link" onClick={() => onBackToOtp?.()}>
        {t('auth.backup.useOtp')}
      </Button>
    </ProForm>
  );
}
