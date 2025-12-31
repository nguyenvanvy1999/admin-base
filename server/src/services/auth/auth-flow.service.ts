import { randomUUID } from 'node:crypto';
import { authenticator } from 'otplib';
import { db, type IDb } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import type {
  AuthChallengeRequestParams,
  AuthEnrollConfirmRequestParams,
  AuthEnrollStartRequestParams,
  LoginParams,
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
import {
  type SettingsService,
  settingsService,
} from 'src/services/settings/settings.service';
import { BadReqErr, ErrCode, getIpAndUa, NotFoundErr } from 'src/share';
import type { ChallengeDto } from 'src/types/auth.types';
import { type AuthTxService, authTxService } from './auth-tx.service';
import { type UserUtilService, userUtilService } from './auth-util.service';
import { type CaptchaService, captchaService } from './captcha.service';
import {
  generateBackupCodes,
  hashBackupCode,
  parseBackupCodes,
  parseUsedBackupCodes,
} from './mfa.service';
import { type PasswordService, passwordService } from './password.service';
import {
  type SecurityMonitorService,
  securityMonitorService,
} from './security-monitor.service';

export type AuthResponse =
  | { status: 'COMPLETED'; session: any }
  | { status: 'CHALLENGE'; authTxId: string; challenge: ChallengeDto };

type NextStep =
  | { kind: 'COMPLETE' }
  | { kind: 'MFA_CHALLENGE' }
  | { kind: 'ENROLL_MFA' };

export class AuthFlowService {
  constructor(
    private readonly deps: {
      db: IDb;
      env: IEnv;
      passwordService: PasswordService;
      userUtilService: UserUtilService;
      authTxService: AuthTxService;
      securityMonitorService: SecurityMonitorService;
      settingService: SettingsService;
      auditLogService: AuditLogsService;
      authenticator: typeof authenticator;
      captchaService: CaptchaService;
    } = {
      db,
      env,
      passwordService,
      userUtilService,
      authTxService,
      securityMonitorService,
      settingService: settingsService,
      auditLogService: auditLogsService,
      authenticator,
      captchaService,
    },
  ) {}

  resolveNextStep(input: {
    user: { mfaTotpEnabled: boolean };
    mfaRequired: boolean;
    riskBased?: boolean;
    risk?: 'LOW' | 'MEDIUM' | 'HIGH';
  }): NextStep {
    const { user, mfaRequired, riskBased, risk } = input;

    if (mfaRequired && !user.mfaTotpEnabled) return { kind: 'ENROLL_MFA' };
    if (user.mfaTotpEnabled) return { kind: 'MFA_CHALLENGE' };

    // Risk-based MFA
    if (riskBased && (risk === 'MEDIUM' || risk === 'HIGH')) {
      return user.mfaTotpEnabled
        ? { kind: 'MFA_CHALLENGE' }
        : { kind: 'ENROLL_MFA' };
    }

    return { kind: 'COMPLETE' };
  }

  async startLogin(params: LoginParams): Promise<AuthResponse> {
    const { email, password, captcha } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const user = await this.deps.userUtilService.findUserForLogin(email);

    // Captcha validation
    const captchaRequired = await this.deps.settingService.enbCaptchaRequired();

    if (captchaRequired && !captcha) {
      await this.deps.auditLogService.pushSecurity(
        {
          category: 'security',
          eventType: SecurityEventType.login_failed,
          severity: SecurityEventSeverity.medium,
          method: 'email',
          email: user.email,
          error: 'captcha_required',
        },
        {
          subjectUserId: user.id,
          userId: user.id,
          visibility: AuditLogVisibility.actor_and_subject,
        },
      );
      throw new BadReqErr(ErrCode.CaptchaRequired);
    }

    if (captcha) {
      const captchaValid = await this.deps.captchaService.validateCaptcha({
        token: captcha.token,
        userInput: captcha.userInput,
      });

      if (!captchaValid) {
        await this.deps.auditLogService.pushSecurity(
          {
            category: 'security',
            eventType: SecurityEventType.login_failed,
            severity: SecurityEventSeverity.medium,
            method: 'email',
            email: user.email,
            error: 'invalid_captcha',
          },
          {
            subjectUserId: user.id,
            userId: user.id,
            visibility: AuditLogVisibility.actor_and_subject,
          },
        );
        throw new BadReqErr(ErrCode.InvalidCaptcha);
      }
    }

    const { enbAttempt, enbExpired } =
      await this.deps.settingService.password();

    if (enbAttempt) {
      this.deps.passwordService.validateAttempt(
        user,
        this.deps.env.PASSWORD_MAX_ATTEMPT,
      );
    }

    const passwordValid = await this.deps.passwordService.verifyAndTrack(
      password,
      user,
    );

    if (!passwordValid) {
      await this.deps.auditLogService.pushSecurity(
        {
          category: 'security',
          eventType: SecurityEventType.login_failed,
          severity: SecurityEventSeverity.medium,
          method: 'email',
          email: user.email,
          error: 'password_mismatch',
        },
        {
          subjectUserId: user.id,
          userId: user.id,
          visibility: AuditLogVisibility.actor_and_subject,
        },
      );
      throw new BadReqErr(ErrCode.PasswordNotMatch);
    }

    if (user.status !== UserStatus.active) {
      await this.deps.auditLogService.pushSecurity(
        {
          category: 'security',
          eventType: SecurityEventType.login_failed,
          severity: SecurityEventSeverity.medium,
          method: 'email',
          email: user.email,
          error: 'user_not_active',
        },
        { subjectUserId: user.id, userId: user.id },
      );
      throw new BadReqErr(ErrCode.UserNotActive);
    }

    if (enbExpired) {
      this.deps.passwordService.validateExpiration(user);
    }

    const securityResult = await this.deps.securityMonitorService.evaluateLogin(
      {
        userId: user.id,
        method: 'email',
      },
    );

    if (securityResult.action === 'block') {
      await this.deps.auditLogService.pushSecurity(
        {
          category: 'security',
          eventType: SecurityEventType.login_failed,
          severity: SecurityEventSeverity.high,
          method: 'email',
          email: user.email,
          error: 'security_blocked',
        },
        { subjectUserId: user.id, userId: user.id },
      );
      throw new BadReqErr(ErrCode.SuspiciousLoginBlocked);
    }

    const authTx = await this.deps.authTxService.create(
      user.id,
      'PASSWORD_VERIFIED',
      { ip: clientIp, ua: userAgent },
      securityResult,
    );

    const mfaRequired = await this.deps.settingService.enbMfaRequired();
    const riskBased = await this.deps.settingService.enbMfaRiskBased();
    const next = this.resolveNextStep({
      user: { mfaTotpEnabled: user.mfaTotpEnabled },
      mfaRequired,
      riskBased,
      risk: securityResult.risk,
    });

    if (next.kind === 'COMPLETE') {
      await this.deps.authTxService.delete(authTx.id);
      const session = await this.deps.userUtilService.completeLogin(
        user,
        clientIp,
        userAgent,
        securityResult,
      );
      await this.deps.auditLogService.pushSecurity(
        {
          category: 'security',
          eventType: SecurityEventType.login_success,
          severity: SecurityEventSeverity.low,
          method: 'email',
          email: user.email ?? '',
          isNewDevice: securityResult?.isNewDevice ?? false,
        },
        {
          subjectUserId: user.id,
          userId: user.id,
          sessionId: session.sessionId,
        },
      );
      return { status: 'COMPLETED', session };
    }

    if (next.kind === 'ENROLL_MFA') {
      await this.deps.authTxService.setState(authTx.id, 'CHALLENGE_MFA_ENROLL');
      return {
        status: 'CHALLENGE',
        authTxId: authTx.id,
        challenge: {
          type: 'MFA_ENROLL',
          methods: ['totp'],
          backupCodesWillBeGenerated: true,
        },
      };
    }

    await this.deps.authTxService.setState(authTx.id, 'CHALLENGE_MFA_REQUIRED');

    await this.deps.auditLogService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.mfa_challenge_started,
        severity: SecurityEventSeverity.low,
        method: 'email',
        metadata: { stage: 'challenge', from: 'login' },
      },
      {
        subjectUserId: user.id,
        userId: user.id,
        visibility: AuditLogVisibility.actor_and_subject,
      },
    );

    return {
      status: 'CHALLENGE',
      authTxId: authTx.id,
      challenge: { type: 'MFA_TOTP', allowBackupCode: true },
    };
  }

  async completeChallenge(
    params: AuthChallengeRequestParams,
  ): Promise<AuthResponse> {
    const { authTxId, type, code } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const tx = await this.deps.authTxService.getOrThrow(authTxId);
    this.deps.authTxService.assertBinding(tx, {
      ip: clientIp,
      ua: userAgent,
    });

    if (tx.state !== 'CHALLENGE_MFA_REQUIRED') {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: 'Invalid auth transaction state',
      });
    }

    this.deps.authTxService.assertChallengeAttemptsAllowed(tx);

    const user = await this.deps.db.user.findUnique({
      where: { id: tx.userId },
      select: {
        id: true,
        email: true,
        status: true,
        created: true,
        modified: true,
        roles: { select: { roleId: true } },
        mfaTotpEnabled: true,
        totpSecret: true,
        backupCodes: true,
        backupCodesUsed: true,
      },
    });

    if (!user) throw new NotFoundErr(ErrCode.UserNotFound);
    if (user.status !== UserStatus.active)
      throw new BadReqErr(ErrCode.UserNotActive);

    let ok = false;

    if (type === 'MFA_TOTP') {
      if (!user.totpSecret) throw new BadReqErr(ErrCode.MfaBroken);
      ok = this.deps.authenticator.verify({
        secret: user.totpSecret,
        token: code,
      });
    } else if (type === 'MFA_BACKUP_CODE') {
      ok = await this.consumeBackupCode(user, code);
    }

    if (!ok) {
      await this.deps.authTxService.incrementChallengeAttempts(authTxId);
      await this.deps.auditLogService.pushSecurity(
        {
          category: 'security',
          eventType: SecurityEventType.mfa_failed,
          severity: SecurityEventSeverity.medium,
          method: type === 'MFA_TOTP' ? 'totp' : 'email',
          error: 'invalid_mfa_code',
        },
        {
          subjectUserId: user.id,
          userId: user.id,
        },
      );
      throw new BadReqErr(
        type === 'MFA_TOTP' ? ErrCode.InvalidOtp : ErrCode.InvalidBackupCode,
      );
    }

    const securityContext = tx.securityResult;

    await this.deps.authTxService.delete(authTxId);

    const session = await this.deps.userUtilService.completeLogin(
      user,
      clientIp,
      userAgent,
      securityContext,
    );

    await this.deps.auditLogService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.mfa_verified,
        severity: SecurityEventSeverity.low,
        method: type === 'MFA_TOTP' ? 'totp' : 'email',
      },
      {
        subjectUserId: user.id,
        userId: user.id,
        sessionId: session.sessionId,
      },
    );

    return { status: 'COMPLETED', session };
  }

  async enrollStart(params: AuthEnrollStartRequestParams) {
    const { authTxId } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const tx = await this.deps.authTxService.getOrThrow(authTxId);
    this.deps.authTxService.assertBinding(tx, {
      ip: clientIp,
      ua: userAgent,
    });

    if (tx.state !== 'CHALLENGE_MFA_ENROLL') {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: 'Invalid auth transaction state',
      });
    }

    const user = await this.deps.db.user.findUnique({
      where: { id: tx.userId },
      select: { id: true, email: true, mfaTotpEnabled: true },
    });
    if (!user) throw new NotFoundErr(ErrCode.UserNotFound);
    if (user.mfaTotpEnabled) throw new BadReqErr(ErrCode.MFAHasBeenSetup);

    const tempSecret = this.deps.authenticator.generateSecret().toUpperCase();
    const otpauthUrl = this.deps.authenticator.keyuri(
      user.email ?? user.id,
      'Admin Base Portal',
      tempSecret,
    );

    const enrollToken = randomUUID();

    await this.deps.authTxService.attachEnroll(authTxId, {
      enrollToken,
      tempTotpSecret: tempSecret,
      startedAt: Date.now(),
    });

    await this.deps.auditLogService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.mfa_setup_started,
        severity: SecurityEventSeverity.low,
        method: 'totp',
        stage: 'request',
      },
      {
        subjectUserId: user.id,
        userId: user.id,
      },
    );

    return { authTxId, enrollToken, otpauthUrl };
  }

  async enrollConfirm(
    params: AuthEnrollConfirmRequestParams,
  ): Promise<AuthResponse & { backupCodes?: string[] }> {
    const { authTxId, enrollToken, otp } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const tx = await this.deps.authTxService.getOrThrow(authTxId);
    this.deps.authTxService.assertBinding(tx, {
      ip: clientIp,
      ua: userAgent,
    });

    if (tx.state !== 'CHALLENGE_MFA_ENROLL') {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: 'Invalid auth transaction state',
      });
    }

    if (!tx.enroll || tx.enroll.enrollToken !== enrollToken) {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: 'Invalid enroll token',
      });
    }

    this.deps.authTxService.assertChallengeAttemptsAllowed(tx);

    const otpOk = this.deps.authenticator.verify({
      secret: tx.enroll.tempTotpSecret,
      token: otp,
    });

    if (!otpOk) {
      await this.deps.authTxService.incrementChallengeAttempts(authTxId);
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    // persist secret + generate backup codes (return once)
    const codes = generateBackupCodes();
    const hashedCodes = codes.map((c) => hashBackupCode(c));

    const user = await this.deps.db.user.update({
      where: { id: tx.userId },
      data: {
        totpSecret: tx.enroll.tempTotpSecret,
        mfaTotpEnabled: true,
        backupCodes: JSON.stringify(hashedCodes),
        backupCodesUsed: JSON.stringify([]),
      },
      select: {
        id: true,
        email: true,
        status: true,
        created: true,
        modified: true,
        roles: { select: { roleId: true } },
        mfaTotpEnabled: true,
      },
    });

    if (user.status !== UserStatus.active) {
      throw new BadReqErr(ErrCode.UserNotActive);
    }

    await this.deps.auditLogService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.mfa_setup_completed,
        severity: SecurityEventSeverity.low,
        method: 'totp',
      },
      {
        subjectUserId: user.id,
        userId: user.id,
      },
    );

    await this.deps.authTxService.delete(authTxId);

    const session = await this.deps.userUtilService.completeLogin(
      user,
      clientIp,
      userAgent,
      tx.securityResult,
    );

    return { status: 'COMPLETED', session, backupCodes: codes };
  }

  private async consumeBackupCode(
    user: {
      id: string;
      backupCodes: string | null;
      backupCodesUsed: string | null;
    },
    backupCode: string,
  ): Promise<boolean> {
    if (!backupCode || backupCode.length !== 8) return false;
    if (!user.backupCodes) return false;

    const hashed = hashBackupCode(backupCode);
    const codes = parseBackupCodes(user.backupCodes);
    const used = parseUsedBackupCodes(user.backupCodesUsed);

    if (used.includes(hashed)) {
      throw new BadReqErr(ErrCode.BackupCodeAlreadyUsed);
    }

    if (!codes.includes(hashed)) return false;

    used.push(hashed);

    await this.deps.db.user.update({
      where: { id: user.id },
      data: { backupCodesUsed: JSON.stringify(used) },
      select: { id: true },
    });

    return true;
  }
}

export const authFlowService = new AuthFlowService();
