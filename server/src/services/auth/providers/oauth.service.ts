import { createHash, createHmac, randomBytes, randomUUID } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { authenticator } from 'otplib';
import { db, type IDb } from 'src/config/db';
import type {
  GoogleLoginParams,
  IAuthResponse,
  LinkTelegramParams,
} from 'src/dtos/auth.dto';
import {
  AuditLogVisibility,
  SecurityEventSeverity,
  UserStatus,
} from 'src/generated';
import {
  type AuditLogsService,
  auditLogsService,
} from 'src/services/audit-logs/audit-logs.service';
import { authFlowService } from 'src/services/auth/core/auth-flow.service';
import { authTxService } from 'src/services/auth/core/auth-tx.service';
import {
  type OtpService,
  otpService,
} from 'src/services/auth/methods/otp.service';
import {
  type SecurityMonitorService,
  securityMonitorService,
} from 'src/services/auth/security/security-monitor.service';
import {
  AuthMethod,
  AuthStatus,
  AuthTxState,
  ChallengeType,
} from 'src/services/auth/types/constants';
import {
  type UserUtilService,
  userUtilService,
} from 'src/services/auth/utils/auth-util.service';
import {
  type SettingsService,
  settingsService,
} from 'src/services/settings/settings.service';
import {
  BadReqErr,
  CoreErr,
  DB_PREFIX,
  defaultRoles,
  ErrCode,
  type IdUtil,
  idUtil,
  OAUTH,
  type PrismaTx,
  PurposeVerify,
  UnAuthErr,
} from 'src/share';
import { ChallengeResponseBuilder } from '../builders/challenge-response.builder';
import { ChallengeResolverService } from '../core/challenge-resolver.service';
import {
  buildLoginFailedAuditLog,
  buildLoginSuccessAuditLog,
  buildMfaChallengeStartedAuditLog,
  buildRegisterCompletedAuditLog,
} from '../utils/auth-audit.helper';

export class OAuthService {
  constructor(
    private readonly deps: {
      db: IDb;
      oauth2ClientFactory: (clientId: string) => OAuth2Client;
      userUtilService: UserUtilService;
      auditLogsService: AuditLogsService;
      securityMonitorService: SecurityMonitorService;
      idUtil: IdUtil;
      crypto: {
        createHash: typeof createHash;
        createHmac: typeof createHmac;
        randomBytes: typeof randomBytes;
        randomUUID: typeof randomUUID;
      };
      authenticator: typeof authenticator;
      settingsService: SettingsService;
      challengeResponseBuilder: ChallengeResponseBuilder;
      challengeResolver: ChallengeResolverService;
      otpService: OtpService;
    } = {
      db,
      oauth2ClientFactory: (clientId: string) => new OAuth2Client(clientId),
      userUtilService,
      auditLogsService,
      securityMonitorService,
      idUtil: idUtil,
      crypto: { createHash, createHmac, randomBytes, randomUUID },
      authenticator,
      settingsService,
      challengeResponseBuilder: new ChallengeResponseBuilder(),
      challengeResolver: new ChallengeResolverService(),
      otpService,
    },
  ) {}

  async googleLogin(
    params: GoogleLoginParams & { ip?: string; userAgent?: string },
  ): Promise<IAuthResponse> {
    if (!params?.idToken) {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: 'idToken is required',
      });
    }
    const { idToken, ip = '', userAgent = '' } = params;

    // 1. Verify Google ID token and get user info
    const provider = await this.deps.db.authProvider.findUnique({
      where: { code: OAUTH.GOOGLE },
      select: { id: true, enabled: true, config: true },
    });

    const { clientId } = (provider?.config as { clientId?: string }) || {};
    if (!provider || !provider.enabled || !clientId) {
      await this.deps.auditLogsService.pushSecurity(
        buildLoginFailedAuditLog(
          { id: '', email: null },
          AuthMethod.EMAIL,
          'provider_not_found',
        ),
        { visibility: AuditLogVisibility.admin_only },
      );
      throw new CoreErr(ErrCode.OAuthProviderNotFound);
    }

    const googleClient = this.deps.oauth2ClientFactory(clientId);
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    if (!payload) {
      await this.deps.auditLogsService.pushSecurity(
        buildLoginFailedAuditLog(
          { id: '', email: null },
          AuthMethod.EMAIL,
          'invalid_google_account',
        ),
        { visibility: AuditLogVisibility.admin_only },
      );
      throw new UnAuthErr(ErrCode.InvalidGoogleAccount);
    }

    const email = payload.email?.toLowerCase();
    const googleId = payload.sub;

    if (!email) {
      await this.deps.auditLogsService.pushSecurity(
        buildLoginFailedAuditLog(
          { id: '', email: null },
          AuthMethod.EMAIL,
          'google_account_not_found',
        ),
        { visibility: AuditLogVisibility.admin_only },
      );
      throw new UnAuthErr(ErrCode.GoogleAccountNotFound);
    }

    // 2. Find or create user
    let user = await this.deps.db.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    if (user) {
      // Link Google account if not already linked
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

        await Promise.allSettled([
          this.deps.auditLogsService.pushSecurity(
            buildLoginSuccessAuditLog(user, AuthMethod.EMAIL, {
              userId: user.id,
              metadata: { linked: true },
            }),
            { subjectUserId: user.id, userId: user.id },
          ),
        ]);
      }
    } else {
      // Create new user with Google OAuth
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

      await Promise.allSettled([
        this.deps.auditLogsService.pushSecurity(
          buildRegisterCompletedAuditLog(user, 'oauth', {
            userId: user.id,
          }),
          { subjectUserId: user.id, userId: user.id },
        ),
      ]);
    }

    // 3. Check user status
    if (user.status !== UserStatus.active) {
      throw new BadReqErr(ErrCode.UserNotActive);
    }

    // 4. Evaluate security risk
    const securityResult = await this.deps.securityMonitorService.evaluateLogin(
      {
        userId: user.id,
        method: OAUTH.GOOGLE,
      },
    );

    if (securityResult.action === 'block') {
      await this.deps.auditLogsService.pushSecurity(
        buildLoginFailedAuditLog(user, AuthMethod.EMAIL, 'security_blocked', {
          userId: user.id,
          severity: SecurityEventSeverity.high,
        }),
        { subjectUserId: user.id, userId: user.id },
      );
      throw new BadReqErr(ErrCode.SuspiciousLoginBlocked);
    }

    // 5. Create auth transaction
    const authTx = await authTxService.create(
      user.id,
      AuthTxState.PASSWORD_VERIFIED,
      { ip, ua: userAgent },
      securityResult,
    );

    // 6. Determine next step (MFA challenge/enroll or complete login)
    const mfaRequired = await this.deps.settingsService.enbMfaRequired();
    const challengeType = authFlowService.resolveNextStep({
      user: { mfaTotpEnabled: user.mfaTotpEnabled },
      mfaRequired,
    });

    // 7. Handle next step
    if (!challengeType) {
      await authTxService.delete(authTx.id);
      const session = await this.deps.userUtilService.completeLogin(
        user,
        ip,
        userAgent,
        securityResult,
      );

      await Promise.allSettled([
        this.deps.auditLogsService.pushSecurity(
          buildLoginSuccessAuditLog(user, AuthMethod.EMAIL, {
            userId: user.id,
            sessionId: session.sessionId,
            isNewDevice: securityResult.isNewDevice ?? false,
          }),
          {
            subjectUserId: user.id,
            userId: user.id,
            sessionId: session.sessionId ?? null,
          },
        ),
      ]);

      return { status: AuthStatus.COMPLETED, session };
    }

    if (challengeType === ChallengeType.MFA_REQUIRED) {
      await authTxService.update(authTx.id, {
        state: AuthTxState.CHALLENGE,
        challengeType: ChallengeType.MFA_REQUIRED,
      });

      if (!user.mfaTotpEnabled && mfaRequired) {
        const res = await this.deps.otpService.sendOtpWithAudit(
          user.email,
          PurposeVerify.MFA_LOGIN,
        );
        if (res) {
          await authTxService.update(authTx.id, {
            emailOtpToken: res.otpToken,
          });
        }
      }

      await Promise.allSettled([
        this.deps.auditLogsService.pushSecurity(
          buildMfaChallengeStartedAuditLog(user, AuthMethod.EMAIL, {
            userId: user.id,
            metadata: {
              stage: 'challenge',
              from: 'oauth',
              method: user.mfaTotpEnabled
                ? 'totp_available'
                : 'email_otp_fallback',
            },
          }),
          {
            subjectUserId: user.id,
            userId: user.id,
            visibility: AuditLogVisibility.actor_and_subject,
          },
        ),
      ]);

      const updatedTx = await authTxService.getOrThrow(authTx.id);
      const availableMethods =
        await this.deps.challengeResolver.resolveAvailableMethods({
          user,
          authTx: updatedTx,
          securityResult,
          challengeType: ChallengeType.MFA_REQUIRED,
        });

      const challenge =
        await this.deps.challengeResponseBuilder.buildMfaRequired({
          user,
          availableMethods,
        });

      return {
        status: AuthStatus.CHALLENGE,
        authTxId: authTx.id,
        challenge,
      };
    }

    throw new BadReqErr(ErrCode.InternalError, {
      errors: `Unexpected challenge type: ${challengeType}`,
    });
  }

  async linkTelegram(params: LinkTelegramParams) {
    const { userId, telegramData } = params;

    const provider = await this.deps.db.authProvider.findUnique({
      where: { code: OAUTH.TELEGRAM },
      select: { id: true, enabled: true, config: true },
    });

    const { botToken } = (provider?.config as { botToken?: string }) || {};
    if (!provider || !provider.enabled || !botToken) {
      await this.deps.auditLogsService.pushSecurity(
        buildLoginFailedAuditLog(
          { id: userId, email: null },
          AuthMethod.EMAIL,
          'provider_not_found',
        ),
        {
          subjectUserId: userId,
          userId,
          visibility: AuditLogVisibility.admin_only,
        },
      );
      throw new CoreErr(ErrCode.OAuthProviderNotFound);
    }

    const isValid = this.verifyTelegramLogin(telegramData, botToken);

    if (!isValid) {
      await this.deps.auditLogsService.pushSecurity(
        buildLoginFailedAuditLog(
          { id: userId, email: null },
          AuthMethod.EMAIL,
          'invalid_telegram_account',
        ),
        {
          subjectUserId: userId,
          userId,
          visibility: AuditLogVisibility.admin_only,
        },
      );
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
      await this.deps.auditLogsService.pushSecurity(
        buildLoginFailedAuditLog(
          { id: userId, email: null },
          AuthMethod.EMAIL,
          'account_already_linked',
        ),
        {
          subjectUserId: userId,
          userId,
          visibility: AuditLogVisibility.admin_only,
        },
      );
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

    await Promise.allSettled([
      this.deps.auditLogsService.pushSecurity(
        buildLoginSuccessAuditLog(
          { id: userId, email: null },
          AuthMethod.EMAIL,
          {
            userId,
            metadata: { providerId: telegramData.id },
          },
        ),
        {
          subjectUserId: userId,
          userId,
        },
      ),
    ]);

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
