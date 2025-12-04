export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  statusCode?: number;
}

export interface ApiErrorResponse {
  message?: string;
  code?: string;
  statusCode: number;
  success?: boolean;
  error?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  total?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Generic list response with items and total count
export interface ListResponse<T> {
  docs: T[];
  count: number;
}

export interface ApiListResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
