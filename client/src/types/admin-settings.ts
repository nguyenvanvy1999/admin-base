export enum SettingDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  JSON = 'json',
}

export interface AdminSetting {
  id: string;
  key: string;
  description: string | null;
  type: SettingDataType;
  value: string;
  isSecret?: boolean;
}

export interface UpdateSettingDto {
  value: string;
  isSecret: boolean;
}
