import {
  LoginForm as AntdLoginForm,
  ProFormCheckbox,
  ProFormText,
} from '@ant-design/pro-components';
import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import type { CredentialsFormValues } from 'src/features/auth/hooks/useAuthFlow';

interface LoginFormProps {
  loading?: boolean;
  serverError?: string;
  onSubmit: (values: CredentialsFormValues) => void;
}

export function LoginForm({ loading, serverError, onSubmit }: LoginFormProps) {
  const { t } = useTranslation();

  const handleFinish = async (
    values: CredentialsFormValues,
  ): Promise<boolean> => {
    await Promise.resolve(
      onSubmit({
        email: values.email,
        password: values.password,
        rememberDevice: Boolean(values.rememberDevice),
      }),
    );
    return true;
  };

  return (
    <AntdLoginForm
      style={{ width: '100%' }}
      title={t('auth.login.title')}
      subTitle={t('auth.login.subtitle')}
      initialValues={{ rememberDevice: true }}
      contentStyle={{ margin: 0, paddingBlock: 0 }}
      submitter={{
        searchConfig: { submitText: t('auth.login.cta') },
        submitButtonProps: {
          block: true,
          size: 'large',
          loading,
        },
      }}
      onFinish={handleFinish}
    >
      {serverError && (
        <Alert
          type="error"
          showIcon
          message={serverError}
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      <ProFormText
        name="email"
        label={t('auth.login.email')}
        placeholder={t('auth.login.emailPlaceholder')}
        fieldProps={{
          size: 'large',
          autoComplete: 'email',
          inputMode: 'email',
        }}
        rules={[
          {
            required: true,
            message: t('auth.login.emailRequired'),
          },
          {
            type: 'email',
            message: t('auth.login.emailInvalid'),
          },
        ]}
      />

      <ProFormText.Password
        name="password"
        label={t('auth.login.password')}
        placeholder={t('auth.login.passwordPlaceholder')}
        fieldProps={{ size: 'large', autoComplete: 'current-password' }}
        rules={[
          {
            required: true,
            message: t('auth.login.passwordRequired'),
          },
          {
            min: 6,
            message: t('auth.login.passwordMin'),
          },
        ]}
      />

      <ProFormCheckbox name="rememberDevice">
        {t('auth.login.rememberDevice')}
      </ProFormCheckbox>
    </AntdLoginForm>
  );
}
