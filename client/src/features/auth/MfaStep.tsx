import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Checkbox,
  Flex,
  Form,
  Input,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { AUTH_MFA_CONFIG } from 'src/config/auth';
import type { MfaChallenge } from 'src/types/auth';
import { z } from 'zod';

const otpSchema = z.object({
  code: z
    .string({ required_error: 'Code is required' })
    .min(AUTH_MFA_CONFIG.otpLength, 'OTP is incomplete')
    .max(AUTH_MFA_CONFIG.otpLength, 'OTP is invalid'),
  rememberDevice: z.boolean().default(true),
});

type OtpFormValues = z.infer<typeof otpSchema>;

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
  const { control, handleSubmit, reset } = useForm<OtpFormValues>({
    defaultValues: {
      code: '',
      rememberDevice: true,
    },
    resolver: zodResolver(otpSchema),
  });

  useEffect(() => {
    reset({ code: '', rememberDevice: true });
    setCooldown(
      challenge.retryAfterSeconds ?? AUTH_MFA_CONFIG.resendCoolDownSeconds,
    );
  }, [challenge.challengeId, challenge.retryAfterSeconds, reset]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const submitHandler = handleSubmit((values) => {
    onSubmit(values.code, values.rememberDevice);
  });

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
    <form onSubmit={submitHandler}>
      <Form layout="vertical" component="div" requiredMark={false}>
        <Flex vertical gap={16}>
          <div>
            <Typography.Title level={4} style={{ marginBottom: 4 }}>
              {t('auth.mfa.title', 'Xác thực đa yếu tố')}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t(
                'auth.mfa.subtitle',
                'Nhập mã OTP từ ứng dụng xác thực hoặc SMS.',
              )}
            </Typography.Text>
          </div>

          {challengeMetadata}

          {serverError && (
            <Alert type="error" message={serverError} showIcon closable />
          )}

          <Controller
            name="code"
            control={control}
            render={({ field, fieldState }) => (
              <Form.Item
                label={t('auth.mfa.codeLabel', 'Mã xác thực')}
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input.OTP
                  {...field}
                  size="large"
                  length={AUTH_MFA_CONFIG.otpLength}
                  autoFocus
                  inputMode="numeric"
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
                {t('auth.mfa.rememberDevice', 'Tin tưởng thiết bị này')}
              </Checkbox>
            )}
          />

          <Flex gap={8}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
            >
              {t('auth.mfa.cta', 'Xác nhận')}
            </Button>
          </Flex>

          <Space
            style={{ width: '100%', justifyContent: 'space-between' }}
            size="small"
          >
            <Button
              type="link"
              onClick={() => onResend?.()}
              disabled={cooldown > 0 || loading}
              loading={resendLoading}
            >
              {cooldown > 0
                ? t('auth.mfa.resendCountdown', {
                    seconds: cooldown,
                  })
                : t('auth.mfa.resend', 'Gửi lại mã')}
            </Button>
            {challenge.allowBackupCode && (
              <Button type="link" onClick={() => onUseBackup?.()}>
                {t('auth.mfa.useBackup', 'Dùng mã dự phòng')}
              </Button>
            )}
          </Space>
        </Flex>
      </Form>
    </form>
  );
}
