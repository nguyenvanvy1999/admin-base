import type { ProColumns } from '@ant-design/pro-components';
import type { ReactNode } from 'react';

export type ResourceScope = 'user' | 'admin' | 'both';

export interface ResourcePermissions {
  view: string | string[];
  viewAll?: string;
  create?: string | string[];
  update?: string | string[];
  delete?: string | string[];
  action?: Record<string, string | string[]>;
}

export interface ResourceEndpoints {
  list: string;
  detail?: string;
  create?: string;
  update?: string;
  delete?: string;
  actions?: Record<string, string>;
}

export interface ResourceDataConfig<TData> {
  idField: string;
  statusField?: string;
  statusComputed?: (item: TData) => string;
  ownerField?: string;
}

export interface ResourceActionConfig<TData> {
  key: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  permission?: string | string[];
  handler: (record: TData) => Promise<void> | void;
  visible?: (record: TData) => boolean;
}

export interface ResourceBulkActionConfig {
  key: string;
  label: string;
  danger?: boolean;
  permission?: string | string[];
  handler: (ids: string[]) => Promise<void> | void;
}

export interface ResourceFilterConfig {
  type: 'text' | 'select' | 'dateRange' | 'date' | 'number';
  field: string;
  label: string;
  options?: Array<{ label: string; value: string | number }>;
  valueEnum?: Record<string, { text: string; status?: string }>;
}

export interface ResourceUIConfig<TData> {
  columns: ProColumns<TData>[];
  filters?: ResourceFilterConfig[];
  actions?: ResourceActionConfig<TData>[];
  bulkActions?: ResourceBulkActionConfig[];
  customComponents?: {
    header?: React.ComponentType;
    footer?: React.ComponentType;
    empty?: React.ComponentType;
  };
}

export interface ResourceContext<
  TData,
  TListParams extends Record<string, any>,
  TActionParams = Record<string, any>,
> {
  name: string;
  displayName: string;
  permissions: ResourcePermissions;
  endpoints: ResourceEndpoints;
  dataConfig: ResourceDataConfig<TData>;
  uiConfig: ResourceUIConfig<TData>;
  scope: ResourceScope;
  listService: (params: TListParams) => Promise<{
    docs: TData[];
    hasNext: boolean;
    nextCursor?: string;
  }>;
  actionService?: (
    action: string,
    params: TActionParams,
  ) => Promise<void> | void;
}
