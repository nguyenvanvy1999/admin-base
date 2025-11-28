import { ProForm, ProFormText } from '@ant-design/pro-components';
import { Alert, Form, Typography } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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

  const handleFinish = async (values: RegisterFormValues): Promise<boolean> => {
    await Promise.resolve(onSubmit(values));
    return true;
  };

  return (
    <ProForm<RegisterFormValues>
      form={form}
      layout="vertical"
      disabled={Boolean(loading || disabled)}
      onFinish={handleFinish}
      submitter={{
        searchConfig: { submitText: t('auth.register.cta') },
        submitButtonProps: {
          block: true,
          size: 'large',
          loading,
          disabled,
        },
        resetButtonProps: false,
      }}
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

      <ProFormText
        name="email"
        label={t('auth.register.email')}
        placeholder={t('auth.register.emailPlaceholder')}
        fieldProps={{
          size: 'large',
          autoComplete: 'email',
          inputMode: 'email',
        }}
        rules={[
          { required: true, message: t('auth.register.emailRequired') },
          { type: 'email', message: t('auth.register.emailInvalid') },
        ]}
      />

      <ProFormText.Password
        name="password"
        label={t('auth.register.password')}
        placeholder={t('auth.register.passwordPlaceholder')}
        fieldProps={{
          size: 'large',
          autoComplete: 'new-password',
        }}
        rules={[
          { required: true, message: t('auth.register.passwordRequired') },
          {
            min: 8,
            max: 128,
            message: t('auth.register.passwordRule'),
          },
        ]}
      />

      <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
        {t('auth.register.haveAccount')}{' '}
        <Link to="/login">{t('auth.register.gotoLogin')}</Link>
      </Typography.Paragraph>
    </ProForm>
  );
}
