import { ProForm, ProFormCheckbox } from '@ant-design/pro-components';
import { Alert, Button, Form, Input, Space, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AUTH_MFA_CONFIG } from 'src/config/auth';
import type { MfaChallenge } from 'src/types/auth';

interface OtpFormValues {
  code: string;
  rememberDevice: boolean;
}

interface MfaStepProps {
  challenge: MfaChallenge;
  loading?: boolean;
  resendLoading?: boolean;
  serverError?: string;
  onSubmit: (code: string, rememberDevice: boolean) => void;
  onResend?: () => void;
  onUseBackup?: () => void;
}

export function MfaStep({
  challenge,
  loading,
  resendLoading,
  serverError,
  onSubmit,
  onResend,
  onUseBackup,
}: MfaStepProps) {
  const { t } = useTranslation();
  const [cooldown, setCooldown] = useState<number>(0);
  const [form] = Form.useForm<OtpFormValues>();

  useEffect(() => {
    form.setFieldsValue({ code: '', rememberDevice: true });
    setCooldown(
      challenge.retryAfterSeconds ?? AUTH_MFA_CONFIG.resendCoolDownSeconds,
    );
  }, [challenge.challengeId, challenge.retryAfterSeconds, form]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const challengeMetadata = useMemo(() => {
    if (!challenge.maskedDestination) {
      return null;
    }
    return (
      <Tag color="blue" bordered={false}>
        {challenge.maskedDestination}
      </Tag>
    );
  }, [challenge.maskedDestination]);

  return (
    <ProForm<OtpFormValues>
      form={form}
      layout="vertical"
      initialValues={{ rememberDevice: true }}
      submitter={{
        searchConfig: { submitText: t('auth.mfa.cta', 'Xác nhận') },
        submitButtonProps: {
          block: true,
          size: 'large',
          loading,
        },
      }}
      onFinish={(values) => {
        onSubmit(values.code, Boolean(values.rememberDevice));
        return Promise.resolve(true);
      }}
    >
      <Typography.Title level={4} style={{ marginBottom: 4 }}>
        {t('auth.mfa.title', 'Xác thực đa yếu tố')}
      </Typography.Title>
      <Typography.Text type="secondary">
        {t('auth.mfa.subtitle', 'Nhập mã OTP từ ứng dụng xác thực hoặc SMS.')}
      </Typography.Text>

      {challengeMetadata}

      {serverError && (
        <Alert
          type="error"
          message={serverError}
          showIcon
          closable
          style={{ marginTop: 16 }}
        />
      )}

      <ProForm.Item
        name="code"
        label={t('auth.mfa.codeLabel', 'Mã xác thực')}
        rules={[
          {
            required: true,
            message: t('auth.mfa.codeRequired', 'Vui lòng nhập mã OTP'),
          },
          {
            len: AUTH_MFA_CONFIG.otpLength,
            message: t('auth.mfa.codeInvalid', 'Mã OTP không hợp lệ'),
          },
        ]}
      >
        <Input.OTP
          size="large"
          length={AUTH_MFA_CONFIG.otpLength}
          autoFocus
          inputMode="numeric"
        />
      </ProForm.Item>

      <ProFormCheckbox name="rememberDevice">
        {t('auth.mfa.rememberDevice', 'Tin tưởng thiết bị này')}
      </ProFormCheckbox>

      <Space
        style={{ width: '100%', justifyContent: 'space-between', marginTop: 8 }}
        size="small"
      >
        <Button
          type="link"
          onClick={() => onResend?.()}
          disabled={cooldown > 0 || loading}
          loading={resendLoading}
        >
          {cooldown > 0
            ? t('auth.mfa.resendCountdown', { seconds: cooldown })
            : t('auth.mfa.resend', 'Gửi lại mã')}
        </Button>
        {challenge.allowBackupCode && (
          <Button type="link" onClick={() => onUseBackup?.()}>
            {t('auth.mfa.useBackup', 'Dùng mã dự phòng')}
          </Button>
        )}
      </Space>
    </ProForm>
  );
}
