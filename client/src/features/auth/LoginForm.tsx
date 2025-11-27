import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Checkbox, Flex, Form, Input, Typography } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { CredentialsFormValues } from 'src/features/auth/hooks/useAuthFlow';
import { z } from 'zod';

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Email is invalid')
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters'),
  rememberDevice: z.boolean().default(true),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  loading?: boolean;
  serverError?: string;
  onSubmit: (values: CredentialsFormValues) => void;
}

export function LoginForm({ loading, serverError, onSubmit }: LoginFormProps) {
  const { t } = useTranslation();

  const { control, handleSubmit } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
      rememberDevice: true,
    },
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  const submitHandler = handleSubmit((values) => {
    onSubmit(values);
  });

  return (
    <form onSubmit={submitHandler} style={{ width: '100%' }}>
      <Form layout="vertical" component="div" requiredMark={false}>
        <Flex vertical gap={16}>
          <div>
            <Typography.Title level={3} style={{ marginBottom: 4 }}>
              {t('auth.login.title', 'Đăng nhập admin')}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t(
                'auth.login.subtitle',
                'Nhập thông tin xác thực để truy cập bảng điều khiển.',
              )}
            </Typography.Text>
          </div>

          {serverError && (
            <Alert type="error" showIcon message={serverError} closable />
          )}

          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <Form.Item
                label={t('auth.login.email', 'Email công việc')}
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input
                  {...field}
                  size="large"
                  placeholder={t(
                    'auth.login.emailPlaceholder',
                    'admin@company.com',
                  )}
                  autoComplete="email"
                  inputMode="email"
                />
              </Form.Item>
            )}
          />

          <Controller
            name="password"
            control={control}
            render={({ field, fieldState }) => (
              <Form.Item
                label={t('auth.login.password', 'Mật khẩu')}
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input.Password
                  {...field}
                  size="large"
                  placeholder={t(
                    'auth.login.passwordPlaceholder',
                    'Nhập mật khẩu',
                  )}
                  autoComplete="current-password"
                />
              </Form.Item>
            )}
          />

          <Controller
            name="rememberDevice"
            control={control}
            render={({ field }) => (
              <Checkbox
                {...field}
                checked={field.value}
                style={{ marginBottom: 12 }}
              >
                {t('auth.login.rememberDevice', 'Tin tưởng thiết bị này')}
              </Checkbox>
            )}
          />

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
          >
            {t('auth.login.cta', 'Tiếp tục')}
          </Button>
        </Flex>
      </Form>
    </form>
  );
}
