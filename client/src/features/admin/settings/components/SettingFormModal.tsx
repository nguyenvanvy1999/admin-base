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
import { sanitizeFormValues } from 'src/lib/utils/form.utils';
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
  valueInput?:
    | string
    | number
    | boolean
    | Date
    | Record<string, unknown>
    | null;
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

    const isValueMasked = setting.isSecret && setting.value === '************';

    if (isValueMasked) {
      return {
        valueInput: undefined,
        isSecret: setting.isSecret ?? false,
        description: setting.description ?? '',
      };
    }

    const parsedValue = parseSettingValue(setting);

    return {
      valueInput:
        setting.type === SettingDataType.JSON
          ? JSON.stringify(parsedValue, null, 2)
          : parsedValue,
      isSecret: setting.isSecret ?? false,
      description: setting.description ?? '',
    };
  }, [setting]);

  const handleSubmit = async (rawValues: SettingFormValues) => {
    if (!setting) return;
    const values = sanitizeFormValues(rawValues);

    const isValueMasked = setting.isSecret && setting.value === '************';
    const currentValueInput = values.valueInput;
    const newIsSecret = values.isSecret ?? false;

    if (
      isValueMasked &&
      newIsSecret &&
      (currentValueInput === undefined || currentValueInput === null)
    ) {
      const payload: UpdateSettingDto = {
        value: setting.value,
        isSecret: newIsSecret,
        description: values.description ?? null,
      };
      await onSubmit(payload);
      return;
    }

    if (isValueMasked && !newIsSecret) {
      if (currentValueInput === undefined || currentValueInput === null) {
        throw new Error('Vui lòng nhập giá trị mới khi bỏ secret');
      }
    }

    let valueToFormat:
      | string
      | number
      | boolean
      | Date
      | Record<string, unknown>
      | null = currentValueInput ?? null;

    if (setting.type === SettingDataType.JSON) {
      valueToFormat =
        typeof valueToFormat === 'string'
          ? valueToFormat
          : typeof valueToFormat === 'object' &&
              valueToFormat !== null &&
              !(valueToFormat instanceof Date)
            ? valueToFormat
            : JSON.stringify(valueToFormat);
    }

    const formattedValue = formatSettingValue(
      valueToFormat ?? null,
      setting.type,
    );

    if (formattedValue === '************') {
      throw new Error(
        'Giá trị không được là "************". Vui lòng nhập giá trị hợp lệ.',
      );
    }

    const validation = validateSettingValue(formattedValue, setting.type);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const payload: UpdateSettingDto = {
      value: formattedValue,
      isSecret: newIsSecret,
      description: values.description ?? null,
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
                validator: (_: Rule, value: unknown) => {
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
        title={(() => {
          const i18nKey = `adminSettingsPage.keys.${setting.key}`;
          const translatedKey = t(i18nKey as any);
          return translatedKey !== i18nKey ? translatedKey : setting.key;
        })()}
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

      <ProFormTextArea
        name="description"
        label={t('adminSettingsPage.form.description')}
        fieldProps={{
          rows: 3,
          placeholder: t('adminSettingsPage.form.descriptionPlaceholder'),
        }}
      />

      {renderValueInput()}

      <ProFormSwitch
        name="isSecret"
        label={t('adminSettingsPage.form.isSecret')}
      />
    </FormModal>
  );
}
