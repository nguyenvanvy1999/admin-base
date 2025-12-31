export const API_KEY_STATUSES = ['active', 'revoked', 'expired'] as const;
export type ApiKeyStatus = (typeof API_KEY_STATUSES)[number];

export interface AdminApiKeySummary {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string; // e.g., "sk_live_xxxx...xxxx"
  status: ApiKeyStatus;
  lastUsedAt: string | null;
  expiresAt: string | null;
  created: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface AdminApiKeyDetail extends AdminApiKeySummary {
  modified: string;
  permissions?: string[];
  ipWhitelist?: string[];
  metadata?: Record<string, unknown>;
}

export interface AdminApiKeyListResponse {
  docs: AdminApiKeySummary[];
  count: number;
}

export interface AdminApiKeyListQuery {
  skip?: number;
  take?: number;
  search?: string;
  userId?: string;
  status?: ApiKeyStatus;
  statuses?: ApiKeyStatus[];
  dateFrom?: string;
  dateTo?: string;
}

export interface AdminApiKeyCreatePayload {
  userId: string;
  name: string;
  expiresAt?: string | null;
  permissions?: string[];
  ipWhitelist?: string[];
  metadata?: Record<string, unknown>;
}

export interface AdminApiKeyUpdatePayload {
  name?: string;
  expiresAt?: string | null;
  permissions?: string[];
  ipWhitelist?: string[];
  metadata?: Record<string, unknown>;
  status?: ApiKeyStatus;
}

export interface AdminApiKeyCreateResponse {
  id: string;
  userId: string;
  name: string;
  key: string; // Full key - shown only once
  keyPrefix: string;
  status: ApiKeyStatus;
  created: string;
}

export interface AdminApiKeyActionResponse {
  success: boolean;
  message?: string;
}

export interface UserApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  status: ApiKeyStatus;
  lastUsedAt: string | null;
  expiresAt: string | null;
  created: string;
}

export interface UserApiKeyDetail extends UserApiKeySummary {
  modified: string;
  permissions?: string[];
  ipWhitelist?: string[];
  metadata?: Record<string, unknown>;
}

export interface UserApiKeyListResponse {
  docs: UserApiKeySummary[];
  count: number;
}

export interface UserApiKeyListQuery {
  skip?: number;
  take?: number;
  search?: string;
  status?: ApiKeyStatus;
  statuses?: ApiKeyStatus[];
}

export interface UserApiKeyCreatePayload {
  name: string;
  expiresAt?: string | null;
  permissions?: string[];
  ipWhitelist?: string[];
  metadata?: Record<string, unknown>;
}

export interface UserApiKeyUpdatePayload {
  name?: string;
  expiresAt?: string | null;
  permissions?: string[];
  ipWhitelist?: string[];
  metadata?: Record<string, unknown>;
}

export interface UserApiKeyCreateResponse {
  id: string;
  name: string;
  key: string; // Full key - shown only once
  keyPrefix: string;
  status: ApiKeyStatus;
  created: string;
}

export interface UserApiKeyActionResponse {
  success: boolean;
  message?: string;
}

export interface ApiKeyUsageRecord {
  id: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  ip: string;
  userAgent?: string;
  statusCode: number;
  timestamp: string;
}

export interface ApiKeyUsageStats {
  totalRequests: number;
  lastUsedAt: string | null;
  topEndpoints: Array<{
    endpoint: string;
    count: number;
  }>;
  requestsByDay: Array<{
    date: string;
    count: number;
  }>;
}

export interface AdminApiKeyUsageListQuery {
  skip?: number;
  take?: number;
  apiKeyId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AdminApiKeyUsageListResponse {
  docs: ApiKeyUsageRecord[];
  count: number;
}

export interface AdminApiKeyUsageStatsResponse {
  stats: ApiKeyUsageStats;
}

export interface ApiKeyFormValues {
  name: string;
  expiresAt?: string | null;
  permissions?: string[];
  ipWhitelist?: string[];
}
