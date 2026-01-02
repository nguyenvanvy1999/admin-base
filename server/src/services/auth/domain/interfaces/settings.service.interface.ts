import type { SETTING } from 'src/share';

export interface ISettingsService {
  getSetting<T>(key: string): Promise<T>;
  getManySettings<const K extends readonly SETTING[]>(
    keys: K,
    opts?: { raw?: boolean },
  ): Promise<any[]>;
  revokeSessionsOnPasswordChange(): Promise<boolean>;
  enbOnlyOneSession(): Promise<boolean>;
  registerOtpLimit(): Promise<number>;
  loginSecurity(): Promise<{
    deviceRecognition: boolean;
    auditWarning: boolean;
    blockUnknownDevice: boolean;
  }>;
}
