import { ProForm } from '@ant-design/pro-components';
import { Alert, Button, Form, Input, Space, Typography } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AUTH_MFA_CONFIG } from 'src/config/auth';

interface OtpFormValues {
  code: string;
}

interface MfaStepProps {
  loading?: boolean;
  serverError?: string;
  canUseBackup?: boolean;
  isLocked?: boolean;
  onSubmit: (code: string) => void;
  onUseBackup?: () => void;
}

export function MfaStep({
  loading,
  serverError,
  canUseBackup,
  isLocked,
  onSubmit,
  onUseBackup,
}: MfaStepProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<OtpFormValues>();

  useEffect(() => {
    form.setFieldsValue({ code: '' });
  }, [form]);

  return (
    <ProForm<OtpFormValues>
      form={form}
      layout="vertical"
      submitter={{
        searchConfig: { submitText: t('auth.mfa.cta') },
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
        {t('auth.mfa.title')}
      </Typography.Title>
      <Typography.Text type="secondary">
        {t('auth.mfa.subtitle')}
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
          title={t('auth.mfa.locked')}
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      <ProForm.Item
        name="code"
        label={t('auth.mfa.codeLabel')}
        rules={[
          {
            required: true,
            message: t('auth.mfa.codeRequired'),
          },
          {
            len: AUTH_MFA_CONFIG.otpLength,
            message: t('auth.mfa.codeInvalid'),
          },
        ]}
      >
        <Input.OTP
          size="large"
          length={AUTH_MFA_CONFIG.otpLength}
          autoFocus
          inputMode="numeric"
          disabled={isLocked}
        />
      </ProForm.Item>

      <Space
        style={{ width: '100%', justifyContent: 'flex-end', marginTop: 8 }}
        size="small"
      >
        {canUseBackup && (
          <Button type="link" onClick={() => onUseBackup?.()}>
            {t('auth.mfa.useBackup')}
          </Button>
        )}
      </Space>
    </ProForm>
  );
}
