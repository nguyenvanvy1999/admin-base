import { type AdminSetting, SettingDataType } from 'src/types/admin-settings';

export const parseSettingValue = (setting: AdminSetting): any => {
  const { value, type } = setting;

  switch (type) {
    case SettingDataType.BOOLEAN:
      return value === 'true';
    case SettingDataType.NUMBER:
      return Number(value);
    case SettingDataType.DATE:
      return new Date(value);
    case SettingDataType.JSON:
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    default:
      return value;
  }
};

export const formatSettingValue = (
  value: any,
  type: SettingDataType,
): string => {
  switch (type) {
    case SettingDataType.BOOLEAN:
      return value ? 'true' : 'false';
    case SettingDataType.NUMBER:
      return String(value);
    case SettingDataType.DATE:
      return value instanceof Date
        ? value.toISOString()
        : new Date(value).toISOString();
    case SettingDataType.JSON:
      return typeof value === 'string' ? value : JSON.stringify(value);
    default:
      return String(value);
  }
};

export const validateSettingValue = (
  value: string,
  type: SettingDataType,
): { valid: boolean; error?: string } => {
  switch (type) {
    case SettingDataType.BOOLEAN:
      if (value !== 'true' && value !== 'false') {
        return { valid: false, error: 'Giá trị phải là "true" hoặc "false"' };
      }
      break;
    case SettingDataType.NUMBER:
      if (isNaN(Number(value)) || value.trim() === '') {
        return { valid: false, error: 'Giá trị phải là số hợp lệ' };
      }
      break;
    case SettingDataType.DATE: {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return {
          valid: false,
          error: 'Giá trị phải là định dạng ngày giờ hợp lệ (ISO 8601)',
        };
      }
      break;
    }
    case SettingDataType.JSON:
      try {
        JSON.parse(value);
      } catch {
        return { valid: false, error: 'Giá trị phải là JSON hợp lệ' };
      }
      break;
  }
  return { valid: true };
};

export const getSettingCategory = (key: string): string => {
  if (key.startsWith('ENB_') || key.includes('SECURITY')) {
    return 'security';
  }
  if (key.includes('RATE_LIMIT') || key.includes('OTP_LIMIT')) {
    return 'rateLimit';
  }
  if (key.includes('MAINTENANCE')) {
    return 'system';
  }
  return 'other';
};
