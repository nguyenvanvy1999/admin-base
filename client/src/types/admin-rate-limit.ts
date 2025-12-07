export type RateLimitType =
  | 'api'
  | 'login'
  | 'password_reset'
  | 'email_verification'
  | 'file_upload';

export interface AdminRateLimit {
  id: string;
  identifier: string;
  type: RateLimitType;
  count: number;
  limit: number;
  windowStart: string;
  windowEnd: string;
  blocked: boolean;
  blockedUntil: string | null;
  created: string;
  modified: string;
}

export interface AdminRateLimitListParams {
  take: number;
  skip: number;
  identifier?: string;
  type?: RateLimitType;
  blocked?: boolean;
  created0?: string;
  created1?: string;
}

export interface AdminRateLimitListResponse {
  docs: AdminRateLimit[];
  count: number;
}

export interface BlockRateLimitParams {
  identifier: string;
  type: RateLimitType;
  blockedUntil?: string;
}

export interface UnblockRateLimitParams {
  identifier: string;
  type: RateLimitType;
}
