import { AppForm, AppFormItem } from '@client/components/common/AppForm';
import { PageHeader } from '@client/components/common/PageHeader';
import {
  Button,
  Card,
  Flex,
  InputNumber,
  Select,
  Switch,
  Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';

type SettingForm = {
  timezone: string;
  riskLimit: number;
  emailDigest: boolean;
};

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <Flex vertical gap={24}>
      <PageHeader
        title={t('settingsPage.title')}
        subtitle={t('settingsPage.subtitle')}
      />
      <Card>
        <AppForm<SettingForm>
          initialValues={{
            timezone: 'Asia/Ho_Chi_Minh',
            riskLimit: 5,
            emailDigest: true,
          }}
          onFinish={(values) => {
            console.log('settings', values);
          }}
        >
          <AppFormItem
            label={t('settingsPage.timezoneLabel')}
            name="timezone"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                {
                  value: 'Asia/Ho_Chi_Minh',
                  label: 'Asia/Ho_Chi_Minh (GMT+7)',
                },
                { value: 'UTC', label: 'UTC' },
                { value: 'America/New_York', label: 'America/New_York' },
              ]}
            />
          </AppFormItem>

          <AppFormItem
            label={t('settingsPage.riskLimitLabel')}
            name="riskLimit"
          >
            <InputNumber min={1} max={20} style={{ width: '100%' }} />
          </AppFormItem>

          <AppFormItem
            label={t('settingsPage.emailDigestLabel')}
            name="emailDigest"
            valuePropName="checked"
          >
            <Switch />
          </AppFormItem>

          <Typography.Paragraph type="secondary">
            {t('settingsPage.description')}
          </Typography.Paragraph>

          <Button type="primary" htmlType="submit">
            {t('settingsPage.submit')}
          </Button>
        </AppForm>
      </Card>
    </Flex>
  );
}
