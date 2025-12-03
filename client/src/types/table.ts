export interface TablePagination {
  current: number;
  pageSize: number;
  total: number;
  hasNext?: boolean;
}

export interface TableSearchParams {
  current?: number;
  pageSize?: number;
  [key: string]: unknown;
}

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

export type PaginationParams =
  | ServerSidePaginationParams
  | CursorBasedPaginationParams;
