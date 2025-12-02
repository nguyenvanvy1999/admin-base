import {
  ProFormDateTimePicker,
  ProFormDigit,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Alert } from 'antd';
import type { Rule } from 'antd/es/form';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal } from 'src/components/common/FormModal';
import {
  formatSettingValue,
  parseSettingValue,
  validateSettingValue,
} from 'src/lib/utils/setting.utils';
import {
  type AdminSetting,
  SettingDataType,
  type UpdateSettingDto,
} from 'src/types/admin-settings';

interface SettingFormModalProps {
  open: boolean;
  setting: AdminSetting | null;
  onClose: () => void;
  onSubmit: (data: UpdateSettingDto) => Promise<void>;
  loading?: boolean;
}

type SettingFormValues = UpdateSettingDto & {
  valueInput?: any;
} & Record<string, unknown>;

export function SettingFormModal({
  open,
  setting,
  onClose,
  onSubmit,
  loading,
}: SettingFormModalProps) {
  const { t } = useTranslation();

  const initialValues = useMemo<Partial<SettingFormValues>>(() => {
    if (!setting) return { isSecret: false };

    const parsedValue = parseSettingValue(setting);
    const isValueMasked = setting.isSecret && setting.value === '************';

    return {
      valueInput:
        setting.type === SettingDataType.JSON && !isValueMasked
          ? JSON.stringify(parsedValue, null, 2)
          : parsedValue,
      isSecret: setting.isSecret ?? false,
    };
  }, [setting]);

  const handleSubmit = async (values: SettingFormValues) => {
    if (!setting) return;

    let valueToFormat = values.valueInput;

    if (setting.type === SettingDataType.JSON) {
      const stringValue =
        typeof valueToFormat === 'string'
          ? valueToFormat
          : JSON.stringify(valueToFormat);
      valueToFormat = stringValue;
    }

    const formattedValue = formatSettingValue(valueToFormat, setting.type);

    const validation = validateSettingValue(formattedValue, setting.type);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const payload: UpdateSettingDto = {
      value: formattedValue,
      isSecret: values.isSecret ?? false,
    };

    await onSubmit(payload);
  };

  if (!setting) return null;

  const renderValueInput = () => {
    const { type, isSecret } = setting;
    const isValueMasked = isSecret && setting.value === '************';

    switch (type) {
      case SettingDataType.BOOLEAN:
        return (
          <ProFormSwitch
            name="valueInput"
            label={t('adminSettingsPage.form.value')}
            rules={[
              {
                required: true,
                message: t('adminSettingsPage.form.valueRequired'),
              },
            ]}
          />
        );

      case SettingDataType.NUMBER:
        return (
          <ProFormDigit
            name="valueInput"
            label={t('adminSettingsPage.form.value')}
            rules={[
              {
                required: true,
                message: t('adminSettingsPage.form.valueRequired'),
              },
            ]}
            fieldProps={{
              style: { width: '100%' },
            }}
          />
        );

      case SettingDataType.DATE:
        return (
          <ProFormDateTimePicker
            name="valueInput"
            label={t('adminSettingsPage.form.value')}
            rules={[
              {
                required: true,
                message: t('adminSettingsPage.form.valueRequired'),
              },
            ]}
            fieldProps={{
              style: { width: '100%' },
              showTime: true,
            }}
          />
        );

      case SettingDataType.JSON:
        return (
          <ProFormTextArea
            name="valueInput"
            label={t('adminSettingsPage.form.value')}
            rules={[
              {
                required: true,
                message: t('adminSettingsPage.form.valueRequired'),
              },
              {
                validator: (_: Rule, value: any) => {
                  if (!value) return Promise.resolve();
                  const stringValue =
                    typeof value === 'string' ? value : JSON.stringify(value);
                  try {
                    JSON.parse(stringValue);
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(
                      new Error(t('adminSettingsPage.form.jsonInvalid')),
                    );
                  }
                },
              },
            ]}
            fieldProps={{
              rows: 6,
              placeholder: t('adminSettingsPage.form.jsonPlaceholder'),
            }}
          />
        );

      default:
        return (
          <ProFormText
            name="valueInput"
            label={t('adminSettingsPage.form.value')}
            rules={[
              {
                required: true,
                message: t('adminSettingsPage.form.valueRequired'),
              },
            ]}
            fieldProps={{
              type: isSecret ? 'password' : 'text',
              placeholder: isValueMasked
                ? t('adminSettingsPage.form.secretPlaceholder')
                : undefined,
            }}
          />
        );
    }
  };

  return (
    <FormModal<SettingFormValues>
      key={setting?.id || 'new'}
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('adminSettingsPage.update.title')}
      okText={t('common.save')}
      loading={loading}
      mode="edit"
      initialValues={initialValues}
      width={600}
      formProps={{
        layout: 'vertical',
      }}
    >
      <Alert
        title={setting.key}
        description={setting.description || '-'}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {setting.isSecret && setting.value === '************' && (
        <Alert
          title={t('adminSettingsPage.form.secretWarning')}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {renderValueInput()}

      <ProFormSwitch
        name="isSecret"
        label={t('adminSettingsPage.form.isSecret')}
      />
    </FormModal>
  );
}
