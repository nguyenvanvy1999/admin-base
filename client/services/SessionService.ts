import { ServiceBase } from '@client/libs/ServiceBase';
import type { SessionStatisticsResponse } from '@server/dto/admin/session.dto';

export class SessionService extends ServiceBase {
  constructor() {
    super('/api/admin/sessions');
  }

  getSessionStatistics(): Promise<SessionStatisticsResponse> {
    return this.get<SessionStatisticsResponse>({
      endpoint: '/api/admin/sessions/statistics',
    });
  }
}

export const sessionService = new SessionService();
