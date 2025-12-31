import { randomUUID } from 'node:crypto';
import { authenticator } from 'otplib';
import { db, type IDb } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import type {
  AuthChallengeRequestParams,
  AuthEnrollConfirmRequestParams,
  AuthEnrollStartRequestParams,
  DisableMfaRequestParams,
  IAuthResponse,
  LoginParams,
  RegenerateBackupCodesResponse,
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
import {
  BadReqErr,
  ErrCode,
  getIpAndUa,
  NotFoundErr,
  PurposeVerify,
  userResSelect,
} from 'src/share';
import { type AuthTxService, authTxService } from './auth-tx.service';
import { type UserUtilService, userUtilService } from './auth-util.service';
import { type CaptchaService, captchaService } from './captcha.service';
import {
  AuthChallengeType,
  AuthMethod,
  AuthNextStepKind,
  AuthStatus,
  AuthTxState,
} from './constants';
import { type MfaService, mfaService } from './mfa.service';
import { type OtpService, otpService } from './otp.service';
import { type PasswordService, passwordService } from './password.service';
import {
  type SecurityMonitorService,
  securityMonitorService,
} from './security-monitor.service';
import { type SessionService, sessionService } from './session.service';

export type AuthResponse = IAuthResponse;

type NextStep =
  | { kind: AuthNextStepKind.COMPLETE }
  | { kind: AuthNextStepKind.MFA_CHALLENGE }
  | { kind: AuthNextStepKind.ENROLL_MFA }
  | { kind: AuthNextStepKind.DEVICE_VERIFY };

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
      sessionService: SessionService;
      otpService: OtpService;
      mfaService: MfaService;
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
      sessionService,
      otpService,
      mfaService,
    },
  ) {}

  resolveNextStep(input: {
    user: { mfaTotpEnabled: boolean };
    mfaRequired: boolean;
    riskBased?: boolean;
    risk?: 'LOW' | 'MEDIUM' | 'HIGH';
    isNewDevice?: boolean;
    deviceVerificationEnabled?: boolean;
    mfaEnrollRequired?: boolean;
  }): NextStep {
    const {
      user,
      mfaRequired,
      riskBased,
      risk,
      isNewDevice,
      deviceVerificationEnabled,
      mfaEnrollRequired,
    } = input;

    if (!user.mfaTotpEnabled && isNewDevice && deviceVerificationEnabled) {
      return { kind: AuthNextStepKind.DEVICE_VERIFY };
    }

    if ((mfaRequired || mfaEnrollRequired) && !user.mfaTotpEnabled)
      return { kind: AuthNextStepKind.ENROLL_MFA };
    if (user.mfaTotpEnabled) return { kind: AuthNextStepKind.MFA_CHALLENGE };

    if (riskBased && (risk === 'MEDIUM' || risk === 'HIGH')) {
      return user.mfaTotpEnabled
        ? { kind: AuthNextStepKind.MFA_CHALLENGE }
        : { kind: AuthNextStepKind.ENROLL_MFA };
    }

    return { kind: AuthNextStepKind.COMPLETE };
  }

  async startLogin(params: LoginParams): Promise<AuthResponse> {
    const { email, password, captcha } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const user = await this.deps.userUtilService.findUserForLogin(email);

    const captchaRequired = await this.deps.settingService.enbCaptchaRequired();

    if (captchaRequired && !captcha) {
      await this.deps.auditLogService.pushSecurity(
        {
          category: 'security',
          eventType: SecurityEventType.login_failed,
          severity: SecurityEventSeverity.medium,
          method: AuthMethod.EMAIL,
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
            method: AuthMethod.EMAIL,
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
          method: AuthMethod.EMAIL,
          email: user.email,
          error: 'password_mismatch',
        },
        {
          subjectUserId: user.id,
          userId: user.id,
          visibility: AuditLogVisibility.actor_and_subject,
        },
      );
      throw new BadReqErr(ErrCode.InvalidCredentials);
    }

    if (user.status !== UserStatus.active) {
      await this.deps.auditLogService.pushSecurity(
        {
          category: 'security',
          eventType: SecurityEventType.login_failed,
          severity: SecurityEventSeverity.medium,
          method: AuthMethod.EMAIL,
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
          method: AuthMethod.EMAIL,
          email: user.email,
          error: 'security_blocked',
        },
        { subjectUserId: user.id, userId: user.id },
      );
      throw new BadReqErr(ErrCode.LoginBlocked);
    }

    const authTx = await this.deps.authTxService.create(
      user.id,
      AuthTxState.PASSWORD_VERIFIED,
      { ip: clientIp, ua: userAgent },
      securityResult,
    );

    const mfaRequired = await this.deps.settingService.enbMfaRequired();
    const riskBased = await this.deps.settingService.enbMfaRiskBased();
    const deviceVerificationEnabled =
      await this.deps.settingService.enbDeviceVerification();
    const next = this.resolveNextStep({
      user: { mfaTotpEnabled: user.mfaTotpEnabled },
      mfaRequired,
      riskBased,
      risk: securityResult.risk,
      isNewDevice: securityResult.isNewDevice,
      deviceVerificationEnabled,
      mfaEnrollRequired: user.mfaEnrollRequired,
    });

    if (next.kind === AuthNextStepKind.COMPLETE) {
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
          method: AuthMethod.EMAIL,
          email: user.email ?? '',
          isNewDevice: securityResult?.isNewDevice ?? false,
        },
        {
          subjectUserId: user.id,
          userId: user.id,
          sessionId: session.sessionId,
        },
      );
      return { status: AuthStatus.COMPLETED, session };
    }

    if (next.kind === 'DEVICE_VERIFY') {
      const res = await this.deps.otpService.sendOtpWithAudit(
        user.email,
        PurposeVerify.DEVICE_VERIFY,
      );
      if (!res) throw new BadReqErr(ErrCode.InternalError);

      await this.deps.authTxService.update(authTx.id, {
        deviceVerifyToken: res.otpToken,
        state: AuthTxState.CHALLENGE_DEVICE_VERIFY,
      });

      // Mask email for response
      const maskedEmail = user.email.replace(
        /^(.{2})(.*)(@.*)$/,
        (_, a, b, c) => `${a}${'*'.repeat(b.length)}${c}`,
      );

      return {
        status: AuthStatus.CHALLENGE,
        authTxId: authTx.id,
        challenge: {
          type: AuthChallengeType.DEVICE_VERIFY,
          media: 'email',
          destination: maskedEmail,
        },
      };
    }

    if (next.kind === 'ENROLL_MFA') {
      if (riskBased && securityResult.risk === 'HIGH' && !user.mfaTotpEnabled) {
        const res = await this.deps.otpService.sendOtpWithAudit(
          user.email,
          PurposeVerify.MFA_LOGIN,
        );
        if (!res) throw new BadReqErr(ErrCode.InternalError); // Failed to send

        await this.deps.authTxService.update(authTx.id, {
          emailOtpToken: res.otpToken,
          state: AuthTxState.CHALLENGE_MFA_REQUIRED,
        });

        return {
          status: AuthStatus.CHALLENGE,
          authTxId: authTx.id,
          challenge: { type: AuthChallengeType.MFA_EMAIL_OTP },
        };
      }

      await this.deps.authTxService.setState(
        authTx.id,
        AuthTxState.CHALLENGE_MFA_ENROLL,
      );
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

    await this.deps.authTxService.setState(
      authTx.id,
      AuthTxState.CHALLENGE_MFA_REQUIRED,
    );

    await this.deps.auditLogService.pushSecurity(
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

  async completeChallenge(
    params: AuthChallengeRequestParams,
  ): Promise<AuthResponse> {
    const { authTxId, type, code } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const tx = await this.deps.authTxService.getOrThrow(authTxId);
    this.deps.authTxService.assertBinding(tx, { ip: clientIp, ua: userAgent });

    if (
      tx.state !== AuthTxState.CHALLENGE_MFA_REQUIRED &&
      tx.state !== AuthTxState.CHALLENGE_DEVICE_VERIFY
    ) {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: 'Invalid auth transaction state',
      });
    }

    this.deps.authTxService.assertChallengeAttemptsAllowed(tx);

    const user = await this.deps.db.user.findUnique({
      where: { id: tx.userId },
      select: userResSelect,
    });

    if (!user) throw new NotFoundErr(ErrCode.UserNotFound);
    if (user.status !== UserStatus.active)
      throw new BadReqErr(ErrCode.UserNotActive);

    let ok = false;

    if (type === AuthChallengeType.MFA_TOTP) {
      if (!user.totpSecret) throw new BadReqErr(ErrCode.MfaBroken);
      ok = this.deps.authenticator.verify({
        secret: user.totpSecret,
        token: code,
      });
    } else if (type === AuthChallengeType.MFA_BACKUP_CODE) {
      ok = await this.consumeBackupCode(user, code);
    } else if (type === AuthChallengeType.MFA_EMAIL_OTP) {
      if (!tx.emailOtpToken) throw new BadReqErr(ErrCode.InvalidState); // Not waiting for email otp
      const verifiedUserId = await this.deps.mfaService.verifyEmailOtp(
        tx.emailOtpToken,
        code,
      );
      ok = verifiedUserId === user.id;
    } else if (type === AuthChallengeType.DEVICE_VERIFY) {
      if (!tx.deviceVerifyToken) throw new BadReqErr(ErrCode.InvalidState);
      const verifiedUserId = await this.deps.otpService.verifyOtp(
        tx.deviceVerifyToken,
        PurposeVerify.DEVICE_VERIFY,
        code,
      );
      ok = verifiedUserId === user.id;
    }

    if (!ok) {
      await this.deps.authTxService.incrementChallengeAttempts(authTxId);
      await this.deps.auditLogService.pushSecurity(
        {
          category: 'security',
          eventType: SecurityEventType.mfa_failed,
          severity: SecurityEventSeverity.medium,
          method:
            type === AuthChallengeType.MFA_TOTP
              ? AuthMethod.TOTP
              : AuthMethod.EMAIL,
          error: 'invalid_mfa_code',
        },
        {
          subjectUserId: user.id,
          userId: user.id,
        },
      );
      throw new BadReqErr(
        type === AuthChallengeType.MFA_TOTP ||
          type === AuthChallengeType.MFA_EMAIL_OTP
          ? ErrCode.InvalidOtp
          : ErrCode.InvalidBackupCode,
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
        method:
          type === AuthChallengeType.MFA_TOTP
            ? AuthMethod.TOTP
            : type === AuthChallengeType.DEVICE_VERIFY ||
                type === AuthChallengeType.MFA_EMAIL_OTP
              ? AuthMethod.EMAIL
              : AuthMethod.BACKUP_CODE,
      },
      {
        subjectUserId: user.id,
        userId: user.id,
        sessionId: session.sessionId,
      },
    );

    return { status: AuthStatus.COMPLETED, session };
  }

  async enrollStart(params: AuthEnrollStartRequestParams) {
    const { authTxId } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const tx = await this.deps.authTxService.getOrThrow(authTxId);
    this.deps.authTxService.assertBinding(tx, { ip: clientIp, ua: userAgent });

    if (tx.state !== AuthTxState.CHALLENGE_MFA_ENROLL) {
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
        method: AuthMethod.TOTP,
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
    this.deps.authTxService.assertBinding(tx, { ip: clientIp, ua: userAgent });

    if (tx.state !== AuthTxState.CHALLENGE_MFA_ENROLL) {
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

    const code = this.deps.mfaService.generateBackupCode();
    const hash = await this.deps.mfaService.hashBackupCode(code);
    await this.deps.mfaService.saveBackupCode(tx.userId, hash);

    const userResult = await this.deps.db.user.update({
      where: { id: tx.userId },
      data: {
        totpSecret: tx.enroll.tempTotpSecret,
        mfaTotpEnabled: true,
        mfaEnrollRequired: false,
      },
      select: userResSelect,
    });

    if (userResult.status !== UserStatus.active) {
      throw new BadReqErr(ErrCode.UserNotActive);
    }

    await this.deps.auditLogService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.mfa_setup_completed,
        severity: SecurityEventSeverity.low,
        method: AuthMethod.TOTP,
      },
      {
        subjectUserId: userResult.id,
        userId: userResult.id,
      },
    );

    await this.deps.authTxService.delete(authTxId);

    const session = await this.deps.userUtilService.completeLogin(
      userResult,
      clientIp,
      userAgent,
      tx.securityResult,
    );

    return { status: AuthStatus.COMPLETED, session, backupCodes: [code] };
  }

  private consumeBackupCode(
    user: {
      id: string;
    },
    backupCode: string,
  ): Promise<boolean> {
    if (!backupCode || backupCode.length !== 8) return Promise.resolve(false);

    return this.deps.mfaService.verifyBackupCode(backupCode, user.id);
  }

  async regenerateBackupCodes(
    userId: string,
  ): Promise<RegenerateBackupCodesResponse> {
    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        mfaTotpEnabled: true,
      },
    });

    if (!user) throw new NotFoundErr(ErrCode.UserNotFound);
    if (!user.mfaTotpEnabled) throw new BadReqErr(ErrCode.ActionNotAllowed);

    const code = this.deps.mfaService.generateBackupCode();
    const hashedCode = await this.deps.mfaService.hashBackupCode(code);

    await this.deps.mfaService.saveBackupCode(userId, hashedCode);

    await this.deps.auditLogService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.mfa_backup_codes_regenerated,
        severity: SecurityEventSeverity.medium,
        method: AuthMethod.TOTP,
      },
      {
        subjectUserId: user.id,
        userId: user.id,
        visibility: AuditLogVisibility.actor_only,
      },
    );

    return { backupCodes: [code] };
  }

  async disableMfa(
    params: { userId: string } & DisableMfaRequestParams,
  ): Promise<void> {
    const { userId, password, code } = params;

    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: {
        ...userResSelect,
        password: true,
        passwordAttempt: true,
        passwordExpired: true,
      },
    });

    if (!user) throw new NotFoundErr(ErrCode.UserNotFound);

    if (!user.mfaTotpEnabled) throw new BadReqErr(ErrCode.ActionNotAllowed);

    const passwordValid = await this.deps.passwordService.verifyAndTrack(
      password,
      user as any,
    );

    if (!passwordValid) {
      await this.deps.auditLogService.pushSecurity(
        {
          category: 'security',
          eventType: SecurityEventType.login_failed,
          severity: SecurityEventSeverity.medium,
          method: AuthMethod.EMAIL,
          email: user.email,
          error: 'password_verification_failed_during_disable_mfa',
        },
        { subjectUserId: user.id, userId: user.id },
      );
      throw new BadReqErr(ErrCode.PasswordNotMatch);
    }

    if (!user.totpSecret) throw new BadReqErr(ErrCode.MfaBroken);

    try {
      const otpOk = this.deps.authenticator.verify({
        secret: user.totpSecret,
        token: code,
      });
      if (!otpOk) throw new Error('Invalid OTP');
    } catch {
      await this.deps.auditLogService.pushSecurity(
        {
          category: 'security',
          eventType: SecurityEventType.mfa_failed,
          severity: SecurityEventSeverity.medium,
          method: AuthMethod.TOTP,
          error: 'invalid_otp_during_disable_mfa',
        },
        { subjectUserId: user.id, userId: user.id },
      );
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    await this.deps.db.user.update({
      where: { id: userId },
      data: {
        mfaTotpEnabled: false,
        totpSecret: null,
      },
      select: { id: true },
    });

    try {
      await this.deps.sessionService.revoke(userId);
    } catch {
      // ignore
    }

    await this.deps.auditLogService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.mfa_disabled,
        severity: SecurityEventSeverity.high,
        method: 'totp',
        disabledBy: 'user',
      },
      {
        subjectUserId: user.id,
        userId: user.id,
        visibility: AuditLogVisibility.actor_and_subject,
      },
    );
  }
}

export const authFlowService = new AuthFlowService();
