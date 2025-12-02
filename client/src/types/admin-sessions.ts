export interface AdminSession {
  id: string;
  created: string;
  expired: string;
  createdById: string;
  revoked: boolean;
  ip: string | null;
}

export interface AdminSessionListParams {
  take: number;
  cursor?: string;
  created0: string;
  created1: string;
  revoked?: boolean;
  ip?: string;
  userIds?: string[];
}

export interface AdminSessionPagingResponse {
  docs: AdminSession[];
  hasNext: boolean;
  nextCursor?: string;
}

export type AdminSessionStatus = 'active' | 'revoked' | 'expired';
