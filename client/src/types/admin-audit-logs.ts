export interface AdminAuditLog {
  id: string;
  payload: Record<string, any>;
  level: string;
  logType: string;
  userId: string | null;
  sessionId: string | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  traceId: string | null;
  correlationId: string | null;
  occurredAt: string;
  created: string;
}

export interface AdminAuditLogListQuery {
  skip?: number;
  take?: number;
  userId?: string;
  sessionId?: string;
  level?: string;
  logType?: string;
  ip?: string;
  traceId?: string;
  correlationId?: string;
  occurredAt0?: string;
  occurredAt1?: string;
}

export interface AdminAuditLogListResponse {
  docs: AdminAuditLog[];
  count: number;
}
