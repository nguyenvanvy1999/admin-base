import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  adminI18nKeys,
  adminI18nService,
} from 'src/services/api/admin-i18n.service';
import type { I18nListParams, I18nUpsertDto } from 'src/types/admin-i18n';

export function useAdminI18nList(params: I18nListParams) {
  return useQuery({
    queryKey: adminI18nKeys.list(params),
    queryFn: () => adminI18nService.list(params),
  });
}

export function useUpsertI18n(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (data: I18nUpsertDto) => adminI18nService.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminI18nKeys.all });
      message.success(
        t('adminI18nPage.messages.saveSuccess', 'Saved successfully'),
      );
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      message.error(
        t('adminI18nPage.messages.saveError', 'Failed to save: {{error}}', {
          error: error.message,
        }),
      );
      options?.onError?.(error);
    },
  });
}

export function useDeleteI18n(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (ids: string[]) => adminI18nService.delete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminI18nKeys.all });
      message.success(
        t('adminI18nPage.messages.deleteSuccess', 'Deleted successfully'),
      );
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      message.error(
        t('adminI18nPage.messages.deleteError', 'Failed to delete: {{error}}', {
          error: error.message,
        }),
      );
      options?.onError?.(error);
    },
  });
}

export function useImportI18n(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (file: File) => adminI18nService.import(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminI18nKeys.all });
      message.success(
        t('adminI18nPage.messages.importSuccess', 'Imported successfully'),
      );
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      message.error(
        t('adminI18nPage.messages.importError', 'Failed to import: {{error}}', {
          error: error.message,
        }),
      );
      options?.onError?.(error);
    },
  });
}

export function useExportI18n() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: () => adminI18nService.export(),
    onSuccess: () => {
      message.success(
        t('adminI18nPage.messages.exportSuccess', 'Exported successfully'),
      );
    },
    onError: (error: Error) => {
      message.error(
        t('adminI18nPage.messages.exportError', 'Failed to export: {{error}}', {
          error: error.message,
        }),
      );
    },
  });
}
