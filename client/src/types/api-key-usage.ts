export interface ApiKeyUsageRecord {
  id: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  ip: string;
  userAgent?: string | null;
  statusCode: number;
  timestamp: string;
}

export interface ApiKeyUsageListResponse {
  docs: ApiKeyUsageRecord[];
  count: number;
}

export interface ApiKeyUsageListParams {
  take: number;
  skip: number;
  apiKeyId?: string;
  userId?: string;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  startDate?: string;
  endDate?: string;
  ip?: string;
}

export interface ApiKeyUsageStatsQueryDto {
  apiKeyId?: string;
  userId?: string;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  startDate?: string;
  endDate?: string;
  ip?: string;
}

export interface ApiKeyUsageStatsResponseDto {
  totalRequests: number;
  lastUsedAt: string | null;
  requestsByMethod: Record<string, number>;
  requestsByEndpoint: Record<string, number>;
  requestsByStatusCode: Record<number, number>;
}
