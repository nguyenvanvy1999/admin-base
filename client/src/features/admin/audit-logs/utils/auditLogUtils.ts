import type {
  AdminAuditLog,
  AuditLogCategory,
  SecurityEventSeverity,
} from 'src/types/admin-audit-logs';

export const LEVEL_COLORS: Record<string, string> = {
  error: 'red',
  warn: 'orange',
  info: 'blue',
  debug: 'default',
};

export const CATEGORY_COLORS: Record<AuditLogCategory, string> = {
  cud: 'green',
  security: 'red',
  internal: 'purple',
  system: 'blue',
};

export const SEVERITY_COLORS: Record<SecurityEventSeverity, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
  critical: 'magenta',
};

export const ACTION_COLORS: Record<string, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
};

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

export function renderCudDescription(record: AdminAuditLog): string {
  if (!record.description) return '-';
  return record.description;
}

export function renderSecurityDescription(record: AdminAuditLog): string {
  if (!record.description) return '-';
  return record.description;
}

export function getEntityDisplayTitle(
  entityDisplay: Record<string, unknown> | null,
): string | null {
  if (!entityDisplay) return null;
  if (typeof entityDisplay.title === 'string') return entityDisplay.title;
  if (typeof entityDisplay.name === 'string') return entityDisplay.name;
  if (typeof entityDisplay.email === 'string') return entityDisplay.email;
  return null;
}
