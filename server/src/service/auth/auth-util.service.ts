import dayjs from 'dayjs';
import { type JWTPayload, jwtVerify, SignJWT } from 'jose';
import { db, type IDb } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import type { User } from 'src/generated';
import type { ILoginRes } from 'src/modules/auth/dtos';
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
  BadReqErr,
  DB_PREFIX,
  ErrCode,
  IdUtil,
  type IJwtVerified,
  type ITokenPayload,
  LoginResType,
  type PrismaTx,
  type UPermission,
} from 'src/share';

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
    const expiredAt = dayjs().add(this.e.JWT_REFRESH_TOKEN_EXPIRED).toDate();
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
      expirationTime: dayjs().add(this.e.JWT_ACCESS_TOKEN_EXPIRED).toDate(),
    };
  }

  async verifyAccessToken(
    token: string,
  ): Promise<JWTPayload & { data: ITokenPayload }> {
    const res = await this.verifyJwt(token);
    if (!res) {
      throw new BadReqErr(ErrCode.InvalidToken);
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
    } = {
      db,
      tokenService,
      sessionService,
      settingService,
    },
  ) {}

  async getPermissions(user: {
    roles: { roleId: string }[];
  }): Promise<UPermission[]> {
    const permissions = await this.deps.db.rolePermission.findMany({
      where: { roleId: { in: user.roles.map((x) => x.roleId) } },
      select: { permission: { select: { title: true } } },
    });
    return ArrayUtil.uniq(
      permissions.map((x) => x.permission.title),
    ) as UPermission[];
  }

  async completeLogin(
    user: User & { roles: { roleId: string }[] },
    clientIp: string,
    userAgent: string,
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
        },
        select: { id: true },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
        select: { id: true },
      });
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

  async createProfile(tx: PrismaTx, userId: string): Promise<void> {
    // Profile creation removed - models no longer exist in schema
  }
}

export const userUtilService = new UserUtilService();
