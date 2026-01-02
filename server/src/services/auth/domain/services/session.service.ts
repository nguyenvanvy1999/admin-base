import dayjs from 'dayjs';
import type { IDb } from 'src/config/db';
import type { IEnv } from 'src/config/env';
import type { IGeoIPQueue } from 'src/config/queue';
import type { ILoginRes } from 'src/dtos/auth.dto';
import type { User } from 'src/generated';
import {
  DB_PREFIX,
  detectSessionType,
  type IdUtil,
  type ITokenPayload,
  type SecurityDeviceInsight,
  userResSelect,
} from 'src/share';
import type { ISessionRepository } from '../../infrastructure/repositories/session.repository';
import { AuthStatus } from '../../types/constants';
import type { ISessionService } from '../interfaces/session.service.interface';
import type { ISettingsService } from '../interfaces/settings.service.interface';
import type { ITokenService } from '../interfaces/token.service.interface';
import type { IUserUtilService } from '../interfaces/user-util.service.interface';

export class SessionService implements ISessionService {
  constructor(
    private readonly deps: {
      db: IDb;
      tokenService: ITokenService;
      userUtilService: IUserUtilService;
      settingService: ISettingsService;
      geoIPQueue: IGeoIPQueue;
      idUtil: IdUtil;
      env: IEnv;
      sessionRepository: ISessionRepository;
    },
  ) {}

  async create(
    user: Pick<
      User,
      'id' | 'email' | 'status' | 'created' | 'modified' | 'mfaTotpEnabled'
    > & { roles: { roleId: string }[] },
    clientIp: string,
    userAgent: string,
    security?: SecurityDeviceInsight,
  ): Promise<ILoginRes> {
    if (await this.deps.settingService.enbOnlyOneSession()) {
      await this.deps.sessionRepository.revoke(user.id);
    }

    const sessionId = this.deps.idUtil.dbId(DB_PREFIX.SESSION);
    const payload: ITokenPayload = {
      userId: user.id,
      timestamp: Date.now(),
      sessionId,
      clientIp,
      userAgent,
    };

    const [
      { accessToken, expirationTime },
      { refreshToken, expirationTime: refreshTokenExpirationTime },
    ] = await Promise.all([
      this.deps.tokenService.createAccessToken(payload),
      this.deps.tokenService.createRefreshToken(),
    ]);

    await this.deps.db.$transaction(async (tx) => {
      await tx.session.create({
        data: {
          id: sessionId,
          device: userAgent,
          ip: clientIp,
          createdById: user.id,
          expired: refreshTokenExpirationTime,
          token: refreshToken,
          deviceFingerprint: security?.deviceFingerprint ?? null,
          sessionType: detectSessionType(userAgent),
          userAgent: userAgent,
        },
        select: { id: true },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
        select: { id: true },
      });
    });

    await this.deps.geoIPQueue.add('update-session-location', {
      sessionId,
      ip: clientIp,
    });

    const userRes = {
      ...user,
      permissions: await this.deps.userUtilService.getPermissions(user),
    };

    return {
      type: AuthStatus.COMPLETED,
      accessToken,
      refreshToken,
      exp: expirationTime.getTime(),
      expired: dayjs(expirationTime).format(),
      user: userRes,
      sessionId,
    };
  }

  async findByToken(token: string) {
    const session = await this.deps.sessionRepository.findByToken(token);
    if (!session) {
      return null;
    }

    const user = await this.deps.db.user.findUnique({
      where: { id: session.userId },
      select: userResSelect,
    });

    return {
      id: session.id,
      revoked: session.revoked,
      expired: session.expired,
      createdBy: user
        ? {
            id: user.id,
            email: user.email,
            status: user.status,
          }
        : null,
    };
  }

  async revoke(userId: string, sessionIds?: string[]): Promise<void> {
    await this.deps.sessionRepository.revoke(userId, sessionIds);
  }

  async revokeMany(sessionIds: string[]): Promise<void> {
    await this.deps.sessionRepository.revokeMany(sessionIds);
  }

  async list(params: any) {
    return await this.deps.sessionRepository.list(params);
  }
}
