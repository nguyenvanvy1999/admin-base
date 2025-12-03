import type {
  AdminSession,
  AdminSessionStatus,
} from 'src/types/admin-sessions';

export function getSessionStatus(
  record: AdminSession,
  statusById: Record<string, AdminSessionStatus>,
): AdminSessionStatus {
  return statusById[record.id] ?? 'expired';
}
