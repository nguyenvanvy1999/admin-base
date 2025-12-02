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
    onError: (error: any) => {
      const code = error?.response?.data?.code;
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
