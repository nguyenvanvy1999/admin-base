import dayjs from 'dayjs';
import { type JWTPayload, jwtVerify, SignJWT } from 'jose';
import { db, type IDb } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import { geoIPQueue, type IGeoIPQueue } from 'src/config/queue';
import type { ILoginRes } from 'src/dtos/auth.dto';
import type { User } from 'src/generated';
import { EncryptService } from 'src/service/auth/encrypt.service';
import {
  type SessionService,
  sessionService,
} from 'src/service/auth/session.service';
import {
  type SettingService,
  settingService,
} from 'src/service/misc/setting.service';
import {
  ArrayUtil,
  DB_PREFIX,
  ErrCode,
  IdUtil,
  type IJwtVerified,
  type ITokenPayload,
  LoginResType,
  type SecurityDeviceInsight,
  UnAuthErr,
  type UPermission,
} from 'src/share';
import { detectSessionType } from 'src/share/utils/session.util';
import { timeStringToSeconds } from 'src/share/utils/time.util';

export class TokenService {
  constructor(private readonly e: IEnv = env) {}

  signJwt(payload: Record<string, any>): Promise<string> {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setNotBefore(this.e.JWT_ACCESS_TOKEN_NOT_BEFORE_EXPIRATION)
      .setExpirationTime(this.e.JWT_ACCESS_TOKEN_EXPIRED)
      .setAudience(this.e.JWT_AUDIENCE)
      .setIssuer(this.e.JWT_ISSUER)
      .setSubject(this.e.JWT_SUBJECT)
      .sign(new TextEncoder().encode(this.e.JWT_ACCESS_TOKEN_SECRET_KEY));
  }

  async verifyJwt(token: string): Promise<IJwtVerified | null> {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(this.e.JWT_ACCESS_TOKEN_SECRET_KEY),
      );
      return payload as IJwtVerified;
    } catch {
      return null;
    }
  }

  createRefreshToken(): { refreshToken: string; expirationTime: Date } {
    const expiredAt = dayjs()
      .add(timeStringToSeconds(this.e.JWT_REFRESH_TOKEN_EXPIRED), 's')
      .toDate();
    return {
      refreshToken: IdUtil.token32(),
      expirationTime: expiredAt,
    };
  }

  async createAccessToken(
    payload: ITokenPayload,
  ): Promise<{ accessToken: string; expirationTime: Date }> {
    const data = EncryptService.aes256Encrypt(payload);
    const accessToken = await this.signJwt({ data });
    return {
      accessToken,
      expirationTime: dayjs()
        .add(timeStringToSeconds(this.e.JWT_ACCESS_TOKEN_EXPIRED), 's')
        .toDate(),
    };
  }

  async verifyAccessToken(
    token: string,
  ): Promise<JWTPayload & { data: ITokenPayload }> {
    const res = await this.verifyJwt(token);
    if (!res) {
      throw new UnAuthErr(ErrCode.InvalidToken);
    }
    const data = EncryptService.aes256Decrypt<ITokenPayload>(res.data);
    return { ...res, data };
  }
}

export const tokenService = new TokenService();

export class UserUtilService {
  constructor(
    private readonly deps: {
      db: IDb;
      tokenService: TokenService;
      sessionService: SessionService;
      settingService: SettingService;
      geoIPQueue: IGeoIPQueue;
    } = {
      db,
      tokenService,
      sessionService,
      settingService,
      geoIPQueue,
    },
  ) {}

  async getActiveRoleIds(userId: string): Promise<string[]> {
    const rolePlayers = await this.deps.db.rolePlayer.findMany({
      where: {
        playerId: userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { roleId: true },
    });

    return rolePlayers.map((x) => x.roleId);
  }

  async getPermissions(user: { id: string }): Promise<UPermission[]> {
    const activeRoleIds = await this.getActiveRoleIds(user.id);
    if (activeRoleIds.length === 0) {
      return [];
    }

    const permissions = await this.deps.db.rolePermission.findMany({
      where: { roleId: { in: activeRoleIds } },
      select: { permission: { select: { title: true } } },
    });
    return ArrayUtil.uniq(
      permissions.map((x) => x.permission.title),
    ) as UPermission[];
  }

  async completeLogin(
    user: Pick<
      User,
      'id' | 'email' | 'status' | 'created' | 'modified' | 'mfaTotpEnabled'
    > & { roles: { roleId: string }[] },
    clientIp: string,
    userAgent: string,
    security?: SecurityDeviceInsight,
  ): Promise<ILoginRes> {
    if (await this.deps.settingService.enbOnlyOneSession()) {
      await this.deps.sessionService.revoke(user.id);
    }
    const sessionId = IdUtil.dbId(DB_PREFIX.SESSION);
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
      id: user.id,
      mfaTotpEnabled: user.mfaTotpEnabled,
      created: user.created,
      email: user.email,
      status: user.status,
      modified: user.modified,
      permissions: await this.getPermissions(user),
    };

    return {
      type: LoginResType.COMPLETED,
      accessToken,
      refreshToken,
      exp: expirationTime.getTime(),
      expired: dayjs(expirationTime).format(),
      user: userRes,
    };
  }
}

export const userUtilService = new UserUtilService();
