import { ProForm, ProFormText } from '@ant-design/pro-components';
import { Alert, Button, Form, Typography } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { MfaChallenge } from 'src/types/auth';

interface BackupFormValues {
  code: string;
}

interface BackupCodeStepProps {
  challenge: MfaChallenge | null;
  loading?: boolean;
  serverError?: string;
  onSubmit: (code: string) => void;
  onBackToOtp?: () => void;
}

export function BackupCodeStep({
  challenge,
  loading,
  serverError,
  onSubmit,
  onBackToOtp,
}: BackupCodeStepProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<BackupFormValues>();

  useEffect(() => {
    form.setFieldsValue({ code: '' });
  }, [challenge?.challengeId, form]);

  const remaining = challenge?.backupCodesRemaining;

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

      {typeof remaining === 'number' && (
        <Typography.Text type="secondary">
          {t('auth.backup.remaining', { count: remaining })}
        </Typography.Text>
      )}

      {serverError && (
        <Alert
          type="error"
          message={serverError}
          showIcon
          closable
          style={{ marginTop: 16 }}
        />
      )}

      <ProFormText
        name="code"
        label={t('auth.backup.codeLabel')}
        placeholder={t('auth.backup.placeholder')}
        fieldProps={{ size: 'large', autoFocus: true }}
        rules={[
          {
            required: true,
            message: t('auth.backup.codeRequired'),
          },
          {
            min: 8,
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
