import type { ProColumns } from '@ant-design/pro-components';
import type { TFunction } from 'i18next';
import type { UseUserSearchSelectResult } from '../hooks/useUserSearchSelect';

export interface UserSelectColumnOptions {
  title?: string;
  dataIndex?: string;
  placeholder?: string;
  mode?: 'multiple' | 'tags' | undefined;
  minWidth?: number;
}

export function createUserSelectColumn<T extends Record<string, any>>(
  hookResult: UseUserSearchSelectResult,
  t: TFunction,
  options: UserSelectColumnOptions = {},
): ProColumns<T> {
  const {
    title,
    dataIndex = 'userIds',
    placeholder,
    mode = 'multiple',
    minWidth = 240,
  } = options;

  return {
    title: title ?? t('common.filters.users'),
    dataIndex: dataIndex as keyof T,
    hideInTable: true,
    valueType: 'select',
    fieldProps: {
      ...(mode !== undefined && { mode }),
      allowClear: true,
      showSearch: true,
      style: { minWidth },
      placeholder: placeholder ?? t('common.filters.users'),
      options: hookResult.userOptions,
      onSearch: (value: string) => hookResult.setUserSearch(value),
      filterOption: false,
      loading: hookResult.isLoading,
    },
  } as ProColumns<T>;
}
