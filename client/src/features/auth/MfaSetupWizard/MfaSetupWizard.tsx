import { Alert, Button, Flex, Form, Input, QRCode, Typography } from 'antd';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AUTH_MFA_CONFIG } from 'src/config/auth';

interface MfaSetupWizardProps {
  accountEmail: string;
  totpSecret?: string;
  loadingSecret?: boolean;
  confirmingOtp?: boolean;
  error?: string;
  onRequestSecret: () => void;
  onConfirmOtp: (otp: string) => void;
}

interface ConfirmFormValues {
  otp: string;
}

const ISSUER = 'FinTrack';

export function MfaSetupWizard({
  accountEmail,
  totpSecret,
  loadingSecret,
  confirmingOtp,
  error,
  onRequestSecret,
  onConfirmOtp,
}: MfaSetupWizardProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<ConfirmFormValues>();

  useEffect(() => {
    form.resetFields();
  }, [totpSecret, form]);

  const qrValue = useMemo(() => {
    if (!totpSecret) {
      return '';
    }
    const account = accountEmail || 'user';
    const label = encodeURIComponent(`${ISSUER}:${account}`);
    const params = new URLSearchParams({
      secret: totpSecret,
      issuer: ISSUER,
    });
    return `otpauth://totp/${label}?${params.toString()}`;
  }, [accountEmail, totpSecret]);

  if (!totpSecret) {
    return (
      <Flex vertical gap={16}>
        <div>
          <Typography.Title level={4} style={{ marginBottom: 4 }}>
            {t('auth.setup.title')}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t('auth.setup.subtitle')}
          </Typography.Text>
        </div>

        {error && (
          <Alert
            type="error"
            title={error}
            showIcon
            closable
            style={{ marginTop: 8 }}
          />
        )}

        <Button
          type="primary"
          block
          size="large"
          onClick={onRequestSecret}
          loading={loadingSecret}
        >
          {t('auth.setup.requestCta')}
        </Button>

        <Typography.Text type="secondary">
          {t('auth.setup.requestHint')}
        </Typography.Text>
      </Flex>
    );
  }

  return (
    <Flex vertical gap={16}>
      <div>
        <Typography.Title level={4} style={{ marginBottom: 4 }}>
          {t('auth.setup.scanTitle')}
        </Typography.Title>
        <Typography.Text type="secondary">
          {t('auth.setup.scanSubtitle')}
        </Typography.Text>
      </div>

      <Flex
        align="center"
        justify="center"
        style={{ width: '100%', minHeight: 200 }}
      >
        <QRCode value={qrValue || totpSecret} size={168} />
      </Flex>

      <Typography.Text code style={{ fontSize: 16 }}>
        {totpSecret}
      </Typography.Text>
      <Typography.Text type="secondary">
        {t('auth.setup.copyHint')}
      </Typography.Text>

      {error && (
        <Alert
          type="error"
          title={error}
          showIcon
          closable
          style={{ marginTop: 8 }}
        />
      )}

      <Form<ConfirmFormValues>
        layout="vertical"
        form={form}
        onFinish={(values) => {
          onConfirmOtp(values.otp);
        }}
      >
        <Form.Item
          label={t('auth.setup.otpLabel')}
          name="otp"
          rules={[
            { required: true, message: t('auth.setup.otpRequired') },
            {
              len: AUTH_MFA_CONFIG.otpLength,
              message: t('auth.setup.otpInvalid'),
            },
          ]}
        >
          <Input.OTP
            size="large"
            length={AUTH_MFA_CONFIG.otpLength}
            autoFocus
            inputMode="numeric"
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={confirmingOtp}
        >
          {t('auth.setup.confirmCta')}
        </Button>
      </Form>

      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        {t('auth.setup.backupHint')}
      </Typography.Paragraph>
    </Flex>
  );
}
