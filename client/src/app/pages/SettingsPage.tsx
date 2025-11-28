import {
  ProCard,
  ProForm,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
} from '@ant-design/pro-components';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';

type SettingForm = {
  timezone: string;
  riskLimit: number;
  emailDigest: boolean;
};

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <AppPage
      title={t('settingsPage.title')}
      subtitle={t('settingsPage.subtitle')}
    >
      <ProCard>
        <ProForm<SettingForm>
          layout="vertical"
          initialValues={{
            timezone: 'Asia/Ho_Chi_Minh',
            riskLimit: 5,
            emailDigest: true,
          }}
          onFinish={(values) => {
            console.log('settings', values);
            return Promise.resolve(true);
          }}
          submitter={{
            searchConfig: { submitText: t('settingsPage.submit') },
            submitButtonProps: {
              type: 'primary',
            },
            resetButtonProps: false,
          }}
        >
          <ProFormSelect
            label={t('settingsPage.timezoneLabel')}
            name="timezone"
            rules={[{ required: true }]}
            options={[
              {
                value: 'Asia/Ho_Chi_Minh',
                label: 'Asia/Ho_Chi_Minh (GMT+7)',
              },
              { value: 'UTC', label: 'UTC' },
              { value: 'America/New_York', label: 'America/New_York' },
            ]}
          />

          <ProFormDigit
            label={t('settingsPage.riskLimitLabel')}
            name="riskLimit"
            fieldProps={{ min: 1, max: 20, style: { width: '100%' } }}
          />

          <ProFormSwitch
            label={t('settingsPage.emailDigestLabel')}
            name="emailDigest"
          />

          <Typography.Paragraph type="secondary">
            {t('settingsPage.description')}
          </Typography.Paragraph>
        </ProForm>
      </ProCard>
    </AppPage>
  );
}
