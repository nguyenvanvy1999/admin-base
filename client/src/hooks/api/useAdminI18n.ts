import { useQuery } from '@tanstack/react-query';
import {
  adminI18nKeys,
  adminI18nService,
} from 'src/services/api/admin-i18n.service';
import type { I18nListParams, I18nUpsertDto } from 'src/types/admin-i18n';
import { type MutationCallbacks, useAppMutation } from './useAppMutation';

interface UseAdminI18nListOptions {
  enabled?: boolean;
}

export function useAdminI18nList(
  params: I18nListParams,
  options?: UseAdminI18nListOptions,
) {
  return useQuery({
    queryKey: adminI18nKeys.list(params),
    queryFn: () => adminI18nService.list(params),
    enabled: options?.enabled,
  });
}

export function useUpsertI18n(options?: MutationCallbacks) {
  return useAppMutation({
    mutationFn: (data: I18nUpsertDto) => adminI18nService.upsert(data),
    invalidateKeys: [adminI18nKeys.all],
    successMessageKey: 'adminI18nPage.messages.saveSuccess',
    successMessageDefault: 'Saved successfully',
    errorMessageKey: 'adminI18nPage.messages.saveError',
    errorMessageDefault: 'Failed to save',
    ...options,
  });
}

export function useDeleteI18n(
  options?: MutationCallbacks<void, Error, string[]>,
) {
  return useAppMutation({
    mutationFn: (ids: string[]) => adminI18nService.delete(ids),
    invalidateKeys: [adminI18nKeys.all],
    successMessageKey: 'adminI18nPage.messages.deleteSuccess',
    successMessageDefault: 'Deleted successfully',
    errorMessageKey: 'adminI18nPage.messages.deleteError',
    errorMessageDefault: 'Failed to delete',
    ...options,
  });
}

export function useImportI18n(options?: MutationCallbacks<void, Error, File>) {
  return useAppMutation({
    mutationFn: (file: File) => adminI18nService.import(file),
    invalidateKeys: [adminI18nKeys.all],
    successMessageKey: 'adminI18nPage.messages.importSuccess',
    successMessageDefault: 'Imported successfully',
    errorMessageKey: 'adminI18nPage.messages.importError',
    errorMessageDefault: 'Failed to import',
    ...options,
  });
}

export function useExportI18n(options?: MutationCallbacks) {
  return useAppMutation({
    mutationFn: () => adminI18nService.export(),
    successMessageKey: 'adminI18nPage.messages.exportSuccess',
    successMessageDefault: 'Exported successfully',
    errorMessageKey: 'adminI18nPage.messages.exportError',
    errorMessageDefault: 'Failed to export',
    skipSuccessMessage: false,
    ...options,
  });
}
