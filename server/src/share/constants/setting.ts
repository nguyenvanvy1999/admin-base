import { SettingDataType } from '@server/generated';
import dayjs from 'dayjs';

export enum SETTING {
  MAINTENANCE_END_DATE = 'MAINTENANCE_END_DATE',
  ENB_PASSWORD_ATTEMPT = 'ENB_PASSWORD_ATTEMPT',
  ENB_PASSWORD_EXPIRED = 'ENB_PASSWORD_EXPIRED',
  ENB_MFA_REQUIRED = 'ENB_MFA_REQUIRED',
  ENB_IP_WHITELIST = 'ENB_IP_WHITELIST',
  ENB_ONLY_ONE_SESSION = 'ENB_ONLY_ONE_SESSION',
}

export const defaultSettings = {
  [SETTING.ENB_IP_WHITELIST]: {
    type: SettingDataType.boolean,
    value: 'true',
  },
  [SETTING.MAINTENANCE_END_DATE]: {
    type: SettingDataType.date,
    value: dayjs(0).toJSON(),
  },
  [SETTING.ENB_PASSWORD_ATTEMPT]: {
    type: SettingDataType.boolean,
    value: 'false',
  },
  [SETTING.ENB_PASSWORD_EXPIRED]: {
    type: SettingDataType.boolean,
    value: 'false',
  },
  [SETTING.ENB_MFA_REQUIRED]: {
    type: SettingDataType.boolean,
    value: 'false',
  },
  [SETTING.ENB_ONLY_ONE_SESSION]: {
    type: SettingDataType.boolean,
    value: 'false',
  },
} satisfies Record<SETTING, { value: string; type: SettingDataType }>;
