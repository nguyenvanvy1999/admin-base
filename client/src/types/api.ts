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

// Generic list response with items and total count
export interface ListResponse<T> {
  docs: T[];
  count: number;
}
