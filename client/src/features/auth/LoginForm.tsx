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
      title={t('auth.login.title', 'Đăng nhập admin')}
      subTitle={t(
        'auth.login.subtitle',
        'Nhập thông tin xác thực để truy cập bảng điều khiển.',
      )}
      initialValues={{ rememberDevice: true }}
      submitter={{
        searchConfig: { submitText: t('auth.login.cta', 'Tiếp tục') },
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
        label={t('auth.login.email', 'Email công việc')}
        placeholder={t('auth.login.emailPlaceholder', 'admin@company.com')}
        fieldProps={{
          size: 'large',
          autoComplete: 'email',
          inputMode: 'email',
        }}
        rules={[
          {
            required: true,
            message: t('auth.login.emailRequired', 'Vui lòng nhập email'),
          },
          {
            type: 'email',
            message: t('auth.login.emailInvalid', 'Email không hợp lệ'),
          },
        ]}
      />

      <ProFormText.Password
        name="password"
        label={t('auth.login.password', 'Mật khẩu')}
        placeholder={t('auth.login.passwordPlaceholder', 'Nhập mật khẩu')}
        fieldProps={{ size: 'large', autoComplete: 'current-password' }}
        rules={[
          {
            required: true,
            message: t('auth.login.passwordRequired', 'Vui lòng nhập mật khẩu'),
          },
          {
            min: 6,
            message: t('auth.login.passwordMin', 'Mật khẩu tối thiểu 6 ký tự'),
          },
        ]}
      />

      <ProFormCheckbox name="rememberDevice">
        {t('auth.login.rememberDevice', 'Tin tưởng thiết bị này')}
      </ProFormCheckbox>
    </AntdLoginForm>
  );
}
