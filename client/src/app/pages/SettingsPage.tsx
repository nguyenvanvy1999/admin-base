import { AppForm, AppFormItem } from '@client/components/common/AppForm';
import { PageHeader } from '@client/components/common/PageHeader';
import { Button, Card, Flex, InputNumber, Switch, Typography } from 'antd';
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
            <select className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </AppFormItem>

          <AppFormItem label={t('settingsPage.riskLimitLabel')} name="riskLimit">
            <InputNumber min={1} max={20} className="w-full" />
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
