import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotify } from 'src/hooks/useNotify';
import {
  adminSettingKeys,
  adminSettingsService,
} from 'src/services/api/admin-settings.service';
import type { AdminSetting, UpdateSettingDto } from 'src/types/admin-settings';

export function useAdminSettings() {
  return useQuery<AdminSetting[]>({
    queryKey: adminSettingKeys.list(),
    queryFn: () => adminSettingsService.list(),
  });
}

export function useUpdateSetting(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  const notify = useNotify();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateSettingDto) =>
      adminSettingsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminSettingKeys.lists() });
      notify.success('Cập nhật setting thành công');
      options?.onSuccess?.();
    },
    onError: (error: unknown) => {
      const code = (error as { response?: { data?: { code?: string } } })
        ?.response?.data?.code;
      let message = 'Có lỗi xảy ra khi cập nhật setting';

      if (code === 'ERR_ITEM_NOT_FOUND') {
        message = 'Setting không tồn tại';
      } else if (code === 'ERR_BAD_REQUEST') {
        message = 'Giá trị không hợp lệ. Vui lòng kiểm tra lại định dạng.';
      } else if (code === 'ERR_PERMISSION_DENIED') {
        message = 'Bạn không có quyền thực hiện thao tác này';
      }

      notify.error(message);
    },
  });
}

export function useExportSettings() {
  const notify = useNotify();

  return useMutation({
    mutationFn: () => adminSettingsService.export(),
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
      notify.success('Export settings thành công');
    },
    onError: () => {
      notify.error('Có lỗi xảy ra khi export settings');
    },
  });
}

export function useImportSettings(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  const notify = useNotify();

  return useMutation({
    mutationFn: (data: Record<string, string>) =>
      adminSettingsService.import(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminSettingKeys.lists() });
      notify.success('Import settings thành công');
      options?.onSuccess?.();
    },
    onError: (error: unknown) => {
      const code = (error as { response?: { data?: { code?: string } } })
        ?.response?.data?.code;
      let message = 'Có lỗi xảy ra khi import settings';

      if (code === 'ERR_BAD_REQUEST') {
        message = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại file JSON.';
      } else if (code === 'ERR_PERMISSION_DENIED') {
        message = 'Bạn không có quyền thực hiện thao tác này';
      }

      notify.error(message);
    },
  });
}
