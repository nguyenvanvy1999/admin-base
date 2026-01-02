import type { ILoginRes } from 'src/dtos/auth.dto';
import type { SessionListParams } from 'src/dtos/session.dto';
import type { User } from 'src/generated';
import type { SecurityDeviceInsight } from 'src/share';

export interface ISessionService {
  create(
    user: Pick<
      User,
      'id' | 'email' | 'status' | 'created' | 'modified' | 'mfaTotpEnabled'
    > & {
      roles: { roleId: string }[];
    },
    clientIp: string,
    userAgent: string,
    security?: SecurityDeviceInsight,
  ): Promise<ILoginRes>;
  findByToken(token: string): Promise<{
    id: string;
    revoked: boolean;
    expired: Date;
    createdBy: { id: string; email: string | null; status: string } | null;
  } | null>;
  revoke(userId: string, sessionIds?: string[]): Promise<void>;
  revokeMany(sessionIds: string[]): Promise<void>;
  list(params: SessionListParams): Promise<{
    docs: Array<{
      id: string;
      created: Date;
      createdById: string;
      expired: Date;
      revoked: boolean;
      ip: string | null;
      device: string | null;
      lastActivityAt: Date | null;
    }>;
    hasNext: boolean;
    nextCursor?: string;
  }>;
}
