import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Flex, Form, Input, Typography } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { MfaChallenge } from 'src/types/auth';
import { z } from 'zod';

const backupSchema = z.object({
  code: z
    .string({ required_error: 'Backup code is required' })
    .min(8, 'Backup code must have at least 8 characters'),
});

type BackupFormValues = z.infer<typeof backupSchema>;

interface BackupCodeStepProps {
  challenge: MfaChallenge | null;
  loading?: boolean;
  serverError?: string;
  onSubmit: (code: string) => void;
  onBackToOtp?: () => void;
}

export function BackupCodeStep({
  challenge,
  loading,
  serverError,
  onSubmit,
  onBackToOtp,
}: BackupCodeStepProps) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset } = useForm<BackupFormValues>({
    defaultValues: { code: '' },
    resolver: zodResolver(backupSchema),
  });

  useEffect(() => {
    reset({ code: '' });
  }, [challenge?.challengeId, reset]);

  const submitHandler = handleSubmit((values) => {
    onSubmit(values.code);
  });

  const remaining = challenge?.backupCodesRemaining;

  return (
    <form onSubmit={submitHandler}>
      <Form layout="vertical" component="div" requiredMark={false}>
        <Flex vertical gap={16}>
          <div>
            <Typography.Title level={4} style={{ marginBottom: 4 }}>
              {t('auth.backup.title', 'Dùng mã dự phòng')}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t(
                'auth.backup.subtitle',
                'Nhập một mã dự phòng chưa dùng để tiếp tục.',
              )}
            </Typography.Text>
          </div>

          {typeof remaining === 'number' && (
            <Typography.Text type="secondary">
              {t('auth.backup.remaining', {
                count: remaining,
              })}
            </Typography.Text>
          )}

          {serverError && (
            <Alert type="error" message={serverError} showIcon closable />
          )}

          <Controller
            name="code"
            control={control}
            render={({ field, fieldState }) => (
              <Form.Item
                label={t('auth.backup.codeLabel', 'Mã dự phòng')}
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input
                  {...field}
                  size="large"
                  placeholder={t('auth.backup.placeholder', 'Nhập mã dự phòng')}
                  autoFocus
                />
              </Form.Item>
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
              {t('auth.backup.cta', 'Xác nhận')}
            </Button>
          </Flex>

          <Button type="link" onClick={() => onBackToOtp?.()}>
            {t('auth.backup.useOtp', 'Quay lại OTP')}
          </Button>
        </Flex>
      </Form>
    </form>
  );
}
