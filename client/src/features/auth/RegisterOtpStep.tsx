import { Alert, Button, Form, Input, Space, Typography } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AUTH_MFA_CONFIG } from 'src/config/auth';

interface OtpFormValues {
  otp: string;
}

interface RegisterOtpStepProps {
  email: string;
  serverError?: string;
  resendError?: string;
  loading?: boolean;
  resendLoading?: boolean;
  resendCooldown?: number;
  isResendBlocked?: boolean;
  canResend?: boolean;
  onSubmit: (otp: string) => void;
  onResend: () => void;
  onBack?: () => void;
}

export function RegisterOtpStep({
  email,
  serverError,
  resendError,
  loading,
  resendLoading,
  resendCooldown = 0,
  isResendBlocked = false,
  canResend = false,
  onSubmit,
  onResend,
  onBack,
}: RegisterOtpStepProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<OtpFormValues>();

  useEffect(() => {
    form.resetFields();
  }, [form]);

  return (
    <Form<OtpFormValues>
      form={form}
      layout="vertical"
      onFinish={(values) => {
        onSubmit(values.otp);
      }}
      disabled={loading}
    >
      <Typography.Title level={4} style={{ marginBottom: 4 }}>
        {t('auth.register.otpTitle')}
      </Typography.Title>
      <Typography.Text type="secondary">
        {t('auth.register.otpSubtitle', { email })}
      </Typography.Text>

      {serverError && (
        <Alert
          type="error"
          showIcon
          title={serverError}
          closable
          style={{ marginTop: 16 }}
        />
      )}

      {resendError && (
        <Alert
          type="warning"
          showIcon
          title={resendError}
          closable
          style={{ marginTop: 16 }}
        />
      )}

      {isResendBlocked && (
        <Alert
          type="error"
          showIcon
          title={t('auth.register.otpLimitReached')}
          style={{ marginTop: 16 }}
        />
      )}

      <Form.Item
        name="otp"
        label={t('auth.register.otpLabel')}
        rules={[
          { required: true, message: t('auth.register.otpRequired') },
          {
            len: AUTH_MFA_CONFIG.otpLength,
            message: t('auth.register.otpInvalid'),
          },
        ]}
        style={{ marginTop: 24 }}
      >
        <Input.OTP
          size="large"
          length={AUTH_MFA_CONFIG.otpLength}
          autoFocus
          inputMode="numeric"
        />
      </Form.Item>

      <Space
        orientation="vertical"
        style={{ width: '100%', marginTop: 8 }}
        size="small"
      >
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={loading}
        >
          {t('auth.register.otpCta')}
        </Button>
        <Button
          type="link"
          block
          onClick={onResend}
          disabled={!canResend}
          loading={resendLoading}
        >
          {canResend
            ? t('auth.register.otpResend')
            : t('auth.register.otpResendCountdown', {
                seconds: resendCooldown,
              })}
        </Button>
        <Button type="link" block onClick={() => onBack?.()}>
          {t('auth.register.backToCredentials')}
        </Button>
      </Space>
    </Form>
  );
}
