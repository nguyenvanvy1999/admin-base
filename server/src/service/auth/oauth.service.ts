import { createHash, createHmac } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { db, type IDb } from 'src/config/db';
import type {
  GoogleLoginParams,
  ILoginRes,
  LinkTelegramParams,
} from 'src/dtos/auth.dto';
import { UserStatus } from 'src/generated';
import {
  type AuditLogsService,
  auditLogsService,
} from 'src/service/audit-logs/audit-logs.service';
import {
  type UserUtilService,
  userUtilService,
} from 'src/service/auth/auth-util.service';
import {
  type SecurityMonitorService,
  securityMonitorService,
} from 'src/service/auth/security-monitor.service';
import {
  ACTIVITY_TYPE,
  type AuditLogEntry,
  BadReqErr,
  CoreErr,
  DB_PREFIX,
  defaultRoles,
  ErrCode,
  getIpAndUa,
  IdUtil,
  OAUTH,
  type PrismaTx,
  UnAuthErr,
} from 'src/share';

export class OAuthService {
  constructor(
    private readonly deps: {
      db: IDb;
      oauth2ClientFactory: (clientId: string) => OAuth2Client;
      userUtilService: UserUtilService;
      auditLogService: AuditLogsService;
      securityMonitorService: SecurityMonitorService;
      idUtil: typeof IdUtil;
      crypto: {
        createHash: typeof createHash;
        createHmac: typeof createHmac;
      };
    } = {
      db,
      oauth2ClientFactory: (clientId: string) => new OAuth2Client(clientId),
      userUtilService,
      auditLogService: auditLogsService,
      securityMonitorService,
      idUtil: IdUtil,
      crypto: { createHash, createHmac },
    },
  ) {}

  async googleLogin(params: GoogleLoginParams): Promise<ILoginRes> {
    const { idToken } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const provider = await this.deps.db.authProvider.findUnique({
      where: { code: OAUTH.GOOGLE },
      select: { id: true, enabled: true, config: true },
    });

    const { clientId } = (provider?.config as { clientId?: string }) || {};
    if (!provider || !provider.enabled || !clientId) {
      await this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.LOGIN,
        payload: { method: OAUTH.GOOGLE, error: 'provider_not_found' },
      });
      throw new CoreErr(ErrCode.OAuthProviderNotFound);
    }

    const googleClient = this.deps.oauth2ClientFactory(clientId);

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      await this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.LOGIN,
        payload: { method: OAUTH.GOOGLE, error: 'invalid_google_account' },
      });
      throw new UnAuthErr(ErrCode.InvalidGoogleAccount);
    }

    const email = payload.email?.toLowerCase();
    const googleId = payload.sub;

    if (!email) {
      await this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.LOGIN,
        payload: { method: OAUTH.GOOGLE, error: 'google_account_not_found' },
      });
      throw new UnAuthErr(ErrCode.GoogleAccountNotFound);
    }

    let user = await this.deps.db.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    const auditEntries: AuditLogEntry[] = [];

    if (user) {
      const authExists = await this.deps.db.userAuthProvider.findFirst({
        where: { providerCode: OAUTH.GOOGLE, providerId: googleId },
        select: { id: true },
      });

      if (!authExists) {
        await this.deps.db.userAuthProvider.create({
          data: {
            providerCode: OAUTH.GOOGLE,
            providerId: googleId,
            id: this.deps.idUtil.dbId(DB_PREFIX.USER_AUTH_PROVIDER),
            authUserId: user.id,
          },
          select: { id: true },
        });

        auditEntries.push({
          type: ACTIVITY_TYPE.LINK_OAUTH,
          payload: { provider: OAUTH.GOOGLE, providerId: googleId },
          userId: user.id,
        });
      }
    } else {
      user = await this.deps.db.$transaction(async (tx: PrismaTx) => {
        const userId = this.deps.idUtil.dbId(DB_PREFIX.USER);
        const createdUser = await tx.user.create({
          data: {
            id: userId,
            email,
            status: UserStatus.active,
            password: '',
            roles: {
              create: {
                id: this.deps.idUtil.dbId(),
                roleId: defaultRoles.user.id,
              },
            },
            refCode: this.deps.idUtil.token8().toUpperCase(),
          },
          include: { roles: true },
        });

        await tx.userAuthProvider.create({
          data: {
            providerCode: OAUTH.GOOGLE,
            providerId: googleId,
            id: this.deps.idUtil.dbId(DB_PREFIX.USER_AUTH_PROVIDER),
            authUserId: userId,
          },
          select: { id: true },
        });

        return createdUser;
      });

      auditEntries.push({
        type: ACTIVITY_TYPE.REGISTER,
        payload: { method: OAUTH.GOOGLE },
        userId: user.id,
      });
    }

    const securityResult = await this.deps.securityMonitorService.evaluateLogin(
      {
        userId: user.id,
        method: OAUTH.GOOGLE,
      },
    );

    if (securityResult.action === 'block') {
      await this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.LOGIN,
        payload: { method: OAUTH.GOOGLE, error: 'security_blocked' },
        userId: user.id,
      });
      throw new BadReqErr(ErrCode.SuspiciousLoginBlocked);
    }

    const loginRes = await this.deps.userUtilService.completeLogin(
      user,
      clientIp ?? '',
      userAgent ?? '',
      securityResult,
    );

    auditEntries.push({
      type: ACTIVITY_TYPE.LOGIN,
      payload: { method: OAUTH.GOOGLE },
      userId: user.id,
      ip: clientIp,
      userAgent,
    });

    await this.deps.auditLogService.pushBatch(auditEntries);

    return loginRes;
  }

  async linkTelegram(params: LinkTelegramParams) {
    const { userId, telegramData } = params;

    const provider = await this.deps.db.authProvider.findUnique({
      where: { code: OAUTH.TELEGRAM },
      select: { id: true, enabled: true, config: true },
    });

    const { botToken } = (provider?.config as { botToken?: string }) || {};
    if (!provider || !provider.enabled || !botToken) {
      await this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.LINK_OAUTH,
        payload: {
          provider: OAUTH.TELEGRAM,
          providerId: telegramData.id,
          error: 'provider_not_found',
        },
        userId,
      });
      throw new CoreErr(ErrCode.OAuthProviderNotFound);
    }

    const isValid = this.verifyTelegramLogin(telegramData, botToken);

    if (!isValid) {
      await this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.LINK_OAUTH,
        payload: {
          provider: OAUTH.TELEGRAM,
          providerId: telegramData.id,
          error: 'invalid_telegram_account',
        },
        userId,
      });
      throw new UnAuthErr(ErrCode.InvalidTelegramAccount);
    }

    const authExists = await this.deps.db.userAuthProvider.findFirst({
      where: {
        OR: [
          { authUserId: userId, providerCode: OAUTH.TELEGRAM },
          { providerCode: OAUTH.TELEGRAM, providerId: telegramData.id },
        ],
      },
      select: { id: true },
    });

    if (authExists) {
      await this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.LINK_OAUTH,
        payload: {
          provider: OAUTH.TELEGRAM,
          providerId: telegramData.id,
          error: 'account_already_linked',
        },
        userId,
      });
      throw new CoreErr(ErrCode.TelegramAccountWasLinked);
    }

    await this.deps.db.userAuthProvider.create({
      data: {
        providerCode: OAUTH.TELEGRAM,
        providerId: telegramData.id,
        authUserId: userId,
        id: this.deps.idUtil.dbId(DB_PREFIX.USER_AUTH_PROVIDER),
      },
      select: { id: true },
    });

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.LINK_OAUTH,
      payload: { provider: OAUTH.TELEGRAM, providerId: telegramData.id },
    });

    return null;
  }

  private verifyTelegramLogin(
    data: LinkTelegramParams['telegramData'],
    botToken: string,
  ): boolean {
    const { hash, ...rest } = data;

    const sortedKeys = Object.keys(rest).sort();
    const checkString = sortedKeys
      .map((key) => `${key}=${rest[key as keyof typeof rest]}`)
      .join('\n');

    const secretKey = this.deps.crypto
      .createHash('sha256')
      .update(botToken)
      .digest();
    const hmac = this.deps.crypto
      .createHmac('sha256', secretKey)
      .update(checkString)
      .digest('hex');

    return hmac === hash;
  }
}

export const oauthService = new OAuthService();
