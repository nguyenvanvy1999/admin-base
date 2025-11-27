import { ProForm, ProFormText } from '@ant-design/pro-components';
import { Alert, Button, Form, Typography } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { MfaChallenge } from 'src/types/auth';

interface BackupFormValues {
  code: string;
}

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
  const [form] = Form.useForm<BackupFormValues>();

  useEffect(() => {
    form.setFieldsValue({ code: '' });
  }, [challenge?.challengeId, form]);

  const remaining = challenge?.backupCodesRemaining;

  return (
    <ProForm<BackupFormValues>
      form={form}
      layout="vertical"
      submitter={{
        searchConfig: { submitText: t('auth.backup.cta', 'Xác nhận') },
        submitButtonProps: {
          block: true,
          size: 'large',
          loading,
        },
      }}
      onFinish={(values) => {
        onSubmit(values.code);
        return Promise.resolve(true);
      }}
    >
      <Typography.Title level={4} style={{ marginBottom: 4 }}>
        {t('auth.backup.title', 'Dùng mã dự phòng')}
      </Typography.Title>
      <Typography.Text type="secondary">
        {t(
          'auth.backup.subtitle',
          'Nhập một mã dự phòng chưa dùng để tiếp tục.',
        )}
      </Typography.Text>

      {typeof remaining === 'number' && (
        <Typography.Text type="secondary">
          {t('auth.backup.remaining', { count: remaining })}
        </Typography.Text>
      )}

      {serverError && (
        <Alert
          type="error"
          message={serverError}
          showIcon
          closable
          style={{ marginTop: 16 }}
        />
      )}

      <ProFormText
        name="code"
        label={t('auth.backup.codeLabel', 'Mã dự phòng')}
        placeholder={t('auth.backup.placeholder', 'Nhập mã dự phòng')}
        fieldProps={{ size: 'large', autoFocus: true }}
        rules={[
          {
            required: true,
            message: t('auth.backup.codeRequired', 'Vui lòng nhập mã dự phòng'),
          },
          {
            min: 8,
            message: t('auth.backup.codeInvalid', 'Tối thiểu 8 ký tự'),
          },
        ]}
      />

      <Button type="link" onClick={() => onBackToOtp?.()}>
        {t('auth.backup.useOtp', 'Quay lại OTP')}
      </Button>
    </ProForm>
  );
}
