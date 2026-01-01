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
  SecurityEventType,
  UserStatus,
} from 'src/generated';
import {
  type AuditLogsService,
  auditLogsService,
} from 'src/services/audit-logs/audit-logs.service';
import { authFlowService } from 'src/services/auth/core/auth-flow.service';
import { authTxService } from 'src/services/auth/core/auth-tx.service';
import {
  type SecurityMonitorService,
  securityMonitorService,
} from 'src/services/auth/security/security-monitor.service';
import {
  AuthChallengeType,
  AuthMethod,
  AuthNextStepKind,
  AuthStatus,
  AuthTxState,
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
  UnAuthErr,
} from 'src/share';

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
        {
          category: 'security',
          eventType: SecurityEventType.login_failed,
          severity: SecurityEventSeverity.medium,
          method: 'email',
          email: '',
          error: 'provider_not_found',
        },
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
        {
          category: 'security',
          eventType: SecurityEventType.login_failed,
          severity: SecurityEventSeverity.medium,
          method: AuthMethod.EMAIL,
          email: '',
          error: 'invalid_google_account',
        },
        { visibility: AuditLogVisibility.admin_only },
      );
      throw new UnAuthErr(ErrCode.InvalidGoogleAccount);
    }

    const email = payload.email?.toLowerCase();
    const googleId = payload.sub;

    if (!email) {
      await this.deps.auditLogsService.pushSecurity(
        {
          category: 'security',
          eventType: SecurityEventType.login_failed,
          severity: SecurityEventSeverity.medium,
          method: AuthMethod.EMAIL,
          email: '',
          error: 'google_account_not_found',
        },
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

        await this.deps.auditLogsService.pushSecurity(
          {
            category: 'security',
            eventType: SecurityEventType.login_success,
            severity: SecurityEventSeverity.low,
            method: AuthMethod.EMAIL,
            email,
            metadata: { linked: true },
          },
          { subjectUserId: user.id, userId: user.id },
        );
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

      await this.deps.auditLogsService.pushSecurity(
        {
          category: 'security',
          eventType: SecurityEventType.register_completed,
          severity: SecurityEventSeverity.low,
          method: AuthMethod.EMAIL,
          email,
        },
        { subjectUserId: user.id, userId: user.id },
      );
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
        {
          category: 'security',
          eventType: SecurityEventType.login_failed,
          severity: SecurityEventSeverity.high,
          method: AuthMethod.EMAIL,
          email: email || '',
          error: 'security_blocked',
        },
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
    const next = authFlowService.resolveNextStep({
      user: { mfaTotpEnabled: user.mfaTotpEnabled },
      mfaRequired,
    });

    // 7. Handle next step
    if (next.kind === AuthNextStepKind.COMPLETE) {
      await authTxService.delete(authTx.id);
      const session = await this.deps.userUtilService.completeLogin(
        user,
        ip,
        userAgent,
        securityResult,
      );

      await this.deps.auditLogsService.pushSecurity(
        {
          category: 'security',
          eventType: SecurityEventType.login_success,
          severity: SecurityEventSeverity.low,
          method: AuthMethod.EMAIL,
          email: email || '',
          isNewDevice: securityResult.isNewDevice ?? false,
        },
        {
          subjectUserId: user.id,
          userId: user.id,
          sessionId: session.sessionId,
        },
      );

      return { status: AuthStatus.COMPLETED, session };
    }

    if (next.kind === AuthNextStepKind.ENROLL_MFA) {
      await authTxService.setState(authTx.id, AuthTxState.CHALLENGE_MFA_ENROLL);
      return {
        status: AuthStatus.CHALLENGE,
        authTxId: authTx.id,
        challenge: {
          type: AuthChallengeType.MFA_ENROLL,
          methods: ['totp'],
          backupCodesWillBeGenerated: true,
        },
      };
    }

    // MFA challenge required
    await authTxService.setState(authTx.id, AuthTxState.CHALLENGE_MFA_REQUIRED);

    await this.deps.auditLogsService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.mfa_challenge_started,
        severity: SecurityEventSeverity.low,
        method: AuthMethod.EMAIL,
        metadata: { stage: 'challenge', from: 'login' },
      },
      {
        subjectUserId: user.id,
        userId: user.id,
        visibility: AuditLogVisibility.actor_and_subject,
      },
    );

    return {
      status: AuthStatus.CHALLENGE,
      authTxId: authTx.id,
      challenge: { type: AuthChallengeType.MFA_TOTP, allowBackupCode: true },
    };
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
        {
          category: 'security',
          eventType: SecurityEventType.login_failed,
          severity: SecurityEventSeverity.medium,
          method: AuthMethod.EMAIL,
          email: '',
          error: 'provider_not_found',
        },
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
        {
          category: 'security',
          eventType: SecurityEventType.login_failed,
          severity: SecurityEventSeverity.medium,
          method: AuthMethod.EMAIL,
          email: '',
          error: 'invalid_telegram_account',
        },
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
        {
          category: 'security',
          eventType: SecurityEventType.login_failed,
          severity: SecurityEventSeverity.medium,
          method: AuthMethod.EMAIL,
          email: '',
          error: 'account_already_linked',
        },
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

    await this.deps.auditLogsService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.login_success,
        severity: SecurityEventSeverity.low,
        method: AuthMethod.EMAIL,
        email: '',
        metadata: { providerId: telegramData.id },
      },
      {
        subjectUserId: userId,
        userId,
      },
    );

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
