import { apiClient, http } from 'src/lib/api/client';
import { createQueryKeys } from 'src/services/api/base.service';
import type {
  I18nListParams,
  I18nPaginatedResponse,
  I18nUpsertDto,
} from '../types';

const ADMIN_I18N_BASE_PATH = '/api/admin/i18n';

export const adminI18nKeys = {
  ...createQueryKeys('admin-i18n'),
  list: (params?: I18nListParams) =>
    [...createQueryKeys('admin-i18n').lists(), params] as const,
};

export const adminI18nService = {
  list(params: I18nListParams): Promise<I18nPaginatedResponse> {
    return apiClient.get<I18nPaginatedResponse>(ADMIN_I18N_BASE_PATH, {
      params,
    });
  },

  upsert(data: I18nUpsertDto): Promise<void> {
    return apiClient.post<void>(ADMIN_I18N_BASE_PATH, data);
  },

  delete(ids: string[]): Promise<void> {
    return apiClient.post<void>(`${ADMIN_I18N_BASE_PATH}/del`, { ids });
  },

  import(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<void>(`${ADMIN_I18N_BASE_PATH}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async export(): Promise<void> {
    const response = await http.get<Blob>(`${ADMIN_I18N_BASE_PATH}/export`, {
      responseType: 'blob',
      headers: {
        Accept: 'application/octet-stream',
      },
    });

    if (!response.data) {
      throw new Error('Export failed');
    }

    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `i18n-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
