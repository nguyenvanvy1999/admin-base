import { AppForm, AppFormItem } from '@client/components/common/AppForm';
import { PageHeader } from '@client/components/common/PageHeader';
import { Button, Card, Flex, InputNumber, Switch, Typography } from 'antd';

type SettingForm = {
  timezone: string;
  riskLimit: number;
  emailDigest: boolean;
};

export default function SettingsPage() {
  return (
    <Flex vertical gap={24}>
      <PageHeader
        title="Cấu hình"
        subtitle="Trang ví dụ cho Form của Ant Design"
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
            label="Múi giờ"
            name="timezone"
            rules={[{ required: true }]}
          >
            <select className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </AppFormItem>

          <AppFormItem label="Giới hạn rủi ro (%)" name="riskLimit">
            <InputNumber min={1} max={20} className="w-full" />
          </AppFormItem>

          <AppFormItem
            label="Gửi email digest hằng ngày"
            name="emailDigest"
            valuePropName="checked"
          >
            <Switch />
          </AppFormItem>

          <Typography.Paragraph type="secondary">
            Dữ liệu chỉ là placeholder để minh họa cách tổ chức form base.
          </Typography.Paragraph>

          <Button type="primary" htmlType="submit">
            Lưu thiết lập
          </Button>
        </AppForm>
      </Card>
    </Flex>
  );
}
