import { apiClient } from 'src/lib/api/client';
import type { AdminSetting, UpdateSettingDto } from 'src/types/admin';
import { createQueryKeys } from '../base.service';

const ADMIN_SETTING_BASE_PATH = '/api/admin/settings';

export const adminSettingKeys = {
  ...createQueryKeys('admin-settings'),
  list: () => [...createQueryKeys('admin-settings').lists()] as const,
};

export const adminSettingsService = {
  list(): Promise<AdminSetting[]> {
    return apiClient.get<AdminSetting[]>(ADMIN_SETTING_BASE_PATH);
  },

  update(id: string, data: UpdateSettingDto): Promise<void> {
    return apiClient.post<void>(`${ADMIN_SETTING_BASE_PATH}/${id}`, data);
  },

  export(): Promise<Record<string, string>> {
    return apiClient.get<Record<string, string>>(
      `${ADMIN_SETTING_BASE_PATH}/export`,
    );
  },

  import(data: Record<string, string>): Promise<void> {
    return apiClient.post<void>(`${ADMIN_SETTING_BASE_PATH}/import`, data);
  },
};
