import { Alert, Button, Form, Input, Typography } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AppForm, AppFormItem } from 'src/components/common/AppForm';
import type { RegisterFormValues } from 'src/features/auth/hooks/useRegisterFlow';

interface RegisterFormProps {
  loading?: boolean;
  disabled?: boolean;
  serverError?: string;
  lockSeconds?: number;
  initialEmail?: string;
  onSubmit: (values: RegisterFormValues) => void;
}

export function RegisterForm({
  loading,
  disabled,
  serverError,
  lockSeconds = 0,
  initialEmail,
  onSubmit,
}: RegisterFormProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<RegisterFormValues>();

  useEffect(() => {
    form.setFieldsValue({
      email: initialEmail ?? '',
    });
  }, [form, initialEmail]);

  const handleFinish = async (values: RegisterFormValues): Promise<void> => {
    await Promise.resolve(onSubmit(values));
  };

  return (
    <AppForm<RegisterFormValues>
      form={form}
      layout="vertical"
      loading={Boolean(loading || disabled)}
      onFinish={handleFinish}
    >
      <Typography.Title level={4} style={{ marginBottom: 4 }}>
        {t('auth.register.title')}
      </Typography.Title>
      <Typography.Text type="secondary">
        {t('auth.register.subtitle')}
      </Typography.Text>

      {serverError && (
        <Alert
          type="error"
          showIcon
          closable
          title={serverError}
          style={{ marginTop: 16 }}
        />
      )}

      {lockSeconds > 0 && (
        <Alert
          type="warning"
          showIcon
          title={t('auth.register.rateLimited', {
            seconds: lockSeconds,
          })}
          style={{ marginTop: 16 }}
        />
      )}

      <AppFormItem
        name="email"
        label={t('auth.register.email')}
        rules={[
          { required: true, message: t('auth.register.emailRequired') },
          { type: 'email', message: t('auth.register.emailInvalid') },
        ]}
      >
        <Input
          size="large"
          placeholder={t('auth.register.emailPlaceholder')}
          autoComplete="email"
          inputMode="email"
        />
      </AppFormItem>

      <AppFormItem
        name="password"
        label={t('auth.register.password')}
        rules={[
          { required: true, message: t('auth.register.passwordRequired') },
          {
            min: 8,
            max: 128,
            message: t('auth.register.passwordRule'),
          },
        ]}
      >
        <Input.Password
          size="large"
          placeholder={t('auth.register.passwordPlaceholder')}
          autoComplete="new-password"
        />
      </AppFormItem>

      <AppFormItem style={{ marginBottom: 0 }}>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={loading}
          disabled={disabled}
        >
          {t('auth.register.cta')}
        </Button>
      </AppFormItem>

      <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
        {t('auth.register.haveAccount')}{' '}
        <Link to="/login">{t('auth.register.gotoLogin')}</Link>
      </Typography.Paragraph>
    </AppForm>
  );
}
