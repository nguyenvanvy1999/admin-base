export interface TableSearchParams {
  current?: number;
  pageSize?: number;
  [key: string]: unknown;
}

// Base table params for all admin tables
export interface BaseTableParams {
  current?: number;
  pageSize?: number;
  search?: string;
}

// Generic table params with custom filters
export type TableParamsWithFilters<T = Record<string, unknown>> =
  BaseTableParams & T;

export interface TableActionConfig<T = unknown> {
  onView?: (record: T) => void;
  onEdit?: (record: T) => void;
  onDelete?: (record: T) => void | Promise<void>;
  viewTooltip?: string;
  editTooltip?: string;
  deleteTooltip?: string;
  canView?: (record: T) => boolean;
  canEdit?: (record: T) => boolean;
  canDelete?: (record: T) => boolean;
}

export interface ServerSidePaginationParams {
  skip: number;
  take: number;
}

export interface CursorBasedPaginationParams {
  cursor?: string | null;
  take: number;
}
