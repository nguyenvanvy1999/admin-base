import { usePagination } from 'src/hooks/pagination';
import type { I18nListParams } from '../types';
import { useAdminI18nList } from './useAdminI18n';

interface UseAdminI18nPaginationOptions {
  initialParams?: I18nListParams;
  pageSize?: number;
  autoLoad?: boolean;
}

export function useAdminI18nPagination(options: UseAdminI18nPaginationOptions) {
  const { initialParams = {}, pageSize = 20, autoLoad = true } = options;

  const pagination = usePagination(useAdminI18nList, {
    initialParams,
    pageSize,
    autoLoad,
  });

  return {
    i18nEntries: pagination.data,
    total: pagination.total,
    pagination: pagination.pagination,
    isLoading: pagination.isLoading,
    isInitialLoading: pagination.isInitialLoading,
    reload: pagination.reload,
    goToPage: pagination.goToPage,
    changePageSize: pagination.changePageSize,
    updateParams: pagination.updateParams,
  };
}
