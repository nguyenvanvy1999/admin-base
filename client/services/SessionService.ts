import { ServiceBase } from '@client/libs/ServiceBase';
import type {
  SessionListResponse,
  SessionStatisticsResponse,
} from '@server/dto/admin/session.dto';

export class SessionService extends ServiceBase {
  constructor() {
    super('/api/admin/sessions');
  }

  listSessions(query?: {
    userId?: string;
    page?: number;
    limit?: number;
    sortBy?: 'created' | 'expired' | 'revoked';
    sortOrder?: 'asc' | 'desc';
    revoked?: boolean;
  }): Promise<SessionListResponse> {
    return this.get<SessionListResponse>({
      endpoint: '/api/admin/sessions',
      params: query,
    });
  }

  revokeSession(sessionId: string, userId?: string): Promise<null> {
    return this.post<null>(
      { sessionIds: [sessionId] },
      {
        endpoint: '/api/admin/sessions/revoke',
        params: userId ? { userId } : undefined,
      },
    );
  }

  revokeManySessions(sessionIds: string[], userId?: string): Promise<null> {
    return this.post<null>(
      { sessionIds },
      {
        endpoint: '/api/admin/sessions/revoke-many',
        params: userId ? { userId } : undefined,
      },
    );
  }

  getSessionStatistics(): Promise<SessionStatisticsResponse> {
    return this.get<SessionStatisticsResponse>({
      endpoint: '/api/admin/sessions/statistics',
    });
  }
}

export const sessionService = new SessionService();
