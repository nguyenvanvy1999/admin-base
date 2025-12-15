import { useQuery } from '@tanstack/react-query';
import {
  adminSettingKeys,
  adminSettingsService,
} from 'src/services/api/admin/settings.service';
import type { AdminSetting, UpdateSettingDto } from 'src/types/admin';
import { type MutationCallbacks, useAppMutation } from './useMutation';

export function useAdminSettings() {
  return useQuery<AdminSetting[]>({
    queryKey: adminSettingKeys.list(),
    queryFn: () => adminSettingsService.list(),
  });
}

export function useUpdateSetting(options?: MutationCallbacks) {
  return useAppMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateSettingDto) =>
      adminSettingsService.update(id, data),
    invalidateKeys: [adminSettingKeys.lists()],
    successMessageKey: 'adminSettingPage.messages.updateSuccess',
    successMessageDefault: 'Cập nhật setting thành công',
    errorMessageKey: 'adminSettingPage.messages.updateError',
    errorMessageDefault: 'Có lỗi xảy ra khi cập nhật setting',
    errorCodeMap: {
      ERR_ITEM_NOT_FOUND: 'Setting không tồn tại',
      ERR_BAD_REQUEST: 'Giá trị không hợp lệ. Vui lòng kiểm tra lại định dạng.',
      ERR_PERMISSION_DENIED: 'Bạn không có quyền thực hiện thao tác này',
    },
    ...options,
  });
}

export function useExportSettings() {
  return useAppMutation({
    mutationFn: () => adminSettingsService.export(),
    successMessageKey: 'adminSettingPage.messages.exportSuccess',
    successMessageDefault: 'Export settings thành công',
    errorMessageKey: 'adminSettingPage.messages.exportError',
    errorMessageDefault: 'Có lỗi xảy ra khi export settings',
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
}

export function useImportSettings(options?: MutationCallbacks) {
  return useAppMutation({
    mutationFn: (data: Record<string, string>) =>
      adminSettingsService.import(data),
    invalidateKeys: [adminSettingKeys.lists()],
    successMessageKey: 'adminSettingPage.messages.importSuccess',
    successMessageDefault: 'Import settings thành công',
    errorMessageKey: 'adminSettingPage.messages.importError',
    errorMessageDefault: 'Có lỗi xảy ra khi import settings',
    errorCodeMap: {
      ERR_BAD_REQUEST: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại file JSON.',
      ERR_PERMISSION_DENIED: 'Bạn không có quyền thực hiện thao tác này',
    },
    ...options,
  });
}
