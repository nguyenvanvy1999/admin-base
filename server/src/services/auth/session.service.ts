import { db } from 'src/config/db';
import { env } from 'src/config/env';
import { geoIPQueue } from 'src/config/queue';
import type { SessionListParams } from 'src/dtos/session.dto';
import { settingsService } from 'src/services/settings/settings.service';
import { idUtil } from 'src/share';
import type { ISessionService } from './domain/interfaces/session.service.interface';
import { SessionService as DomainSessionService } from './domain/services/session.service';
import { jwtProvider } from './infrastructure/providers/jwt.provider';
import { sessionRepository } from './infrastructure/repositories/session.repository';
import { userUtilService } from './utils/auth-util.service';

const domainSessionService = new DomainSessionService({
  db,
  tokenService: jwtProvider,
  userUtilService,
  settingService: settingsService as any,
  geoIPQueue,
  idUtil,
  env,
  sessionRepository,
});

export class SessionService {
  constructor(
    private readonly domainService: ISessionService = domainSessionService,
  ) {}

  async revoke(userId: string, sessionIds: string[] = []): Promise<void> {
    await this.domainService.revoke(userId, sessionIds);
  }

  async findByToken(token: string) {
    const session = await this.domainService.findByToken(token);
    if (!session) return null;

    return {
      revoked: session.revoked,
      id: session.id,
      expired: session.expired,
      createdBy: session.createdBy,
    };
  }

  async revokeMany(sessionIds: string[] = []): Promise<void> {
    await this.domainService.revokeMany(sessionIds);
  }

  async list(params: SessionListParams) {
    const result = await this.domainService.list(params);
    return {
      ...result,
      docs: result.docs.map((doc) => ({
        ...doc,
        device: doc.device ?? '',
      })),
    };
  }
}

export const sessionService = new SessionService();
