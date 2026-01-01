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
  PurposeVerify,
  userResSelect,
} from 'src/share';
import { createAuditContext, createSecurityAuditLog } from './auth-audit.util';
import { assertUserExists } from './auth-errors.util';
import { authMethodFactory } from './auth-method-factory';
import type { AuthMethodContext } from './auth-method-handler.interface';
import { type AuthTxService, authTxService } from './auth-tx.service';
import { type AuthUserService, authUserService } from './auth-user.service';
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
      authUserService: AuthUserService;
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
      authUserService,
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
        createSecurityAuditLog(
          SecurityEventType.login_failed,
          SecurityEventSeverity.medium,
          AuthMethod.EMAIL,
          user,
          { error: 'captcha_required' },
        ),
        createAuditContext(user.id, {
          visibility: AuditLogVisibility.actor_and_subject,
        }),
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
          createSecurityAuditLog(
            SecurityEventType.login_failed,
            SecurityEventSeverity.medium,
            AuthMethod.EMAIL,
            user,
            { error: 'invalid_captcha' },
          ),
          createAuditContext(user.id, {
            visibility: AuditLogVisibility.actor_and_subject,
          }),
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
        createSecurityAuditLog(
          SecurityEventType.login_failed,
          SecurityEventSeverity.medium,
          AuthMethod.EMAIL,
          user,
          { error: 'password_mismatch' },
        ),
        createAuditContext(user.id, {
          visibility: AuditLogVisibility.actor_and_subject,
        }),
      );
      throw new BadReqErr(ErrCode.InvalidCredentials);
    }

    if (user.status !== UserStatus.active) {
      await this.deps.auditLogService.pushSecurity(
        createSecurityAuditLog(
          SecurityEventType.login_failed,
          SecurityEventSeverity.medium,
          AuthMethod.EMAIL,
          user,
          { error: 'user_not_active' },
        ),
        createAuditContext(user.id),
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
        createSecurityAuditLog(
          SecurityEventType.login_failed,
          SecurityEventSeverity.high,
          AuthMethod.EMAIL,
          user,
          { error: 'security_blocked' },
        ),
        createAuditContext(user.id),
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
        createSecurityAuditLog(
          SecurityEventType.login_success,
          SecurityEventSeverity.low,
          AuthMethod.EMAIL,
          user,
          { isNewDevice: securityResult?.isNewDevice ?? false },
        ),
        createAuditContext(user.id, { sessionId: session.sessionId }),
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
      createSecurityAuditLog(
        SecurityEventType.mfa_challenge_started,
        SecurityEventSeverity.low,
        AuthMethod.EMAIL,
        user,
        { metadata: { stage: 'challenge', from: 'login' } },
      ),
      createAuditContext(user.id, {
        visibility: AuditLogVisibility.actor_and_subject,
      }),
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

    const user = await this.deps.authUserService.loadUserForAuth(tx.userId);

    const handler = authMethodFactory.create(type);

    const context: AuthMethodContext = {
      authTxId,
      authTx: tx,
      userId: user.id,
      code,
      clientIp,
      userAgent,
    };

    const result = await handler.verify(context);

    if (!result.verified) {
      await this.deps.authTxService.incrementChallengeAttempts(authTxId);
      await this.deps.auditLogService.pushSecurity(
        createSecurityAuditLog(
          SecurityEventType.mfa_failed,
          SecurityEventSeverity.medium,
          handler.getAuthMethod() as AuthMethod,
          user,
          { error: 'invalid_mfa_code' },
        ),
        createAuditContext(user.id),
      );
      throw new BadReqErr(result.errorCode || ErrCode.InvalidOtp);
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
      createSecurityAuditLog(
        SecurityEventType.mfa_verified,
        SecurityEventSeverity.low,
        handler.getAuthMethod() as AuthMethod,
        user,
      ),
      createAuditContext(user.id, { sessionId: session.sessionId }),
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
    assertUserExists(user);
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
      createSecurityAuditLog(
        SecurityEventType.mfa_setup_started,
        SecurityEventSeverity.low,
        AuthMethod.TOTP,
        user,
        { stage: 'request' },
      ),
      createAuditContext(user.id),
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
      createSecurityAuditLog(
        SecurityEventType.mfa_setup_completed,
        SecurityEventSeverity.low,
        AuthMethod.TOTP,
        userResult,
      ),
      createAuditContext(userResult.id),
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

    assertUserExists(user);
    if (!user.mfaTotpEnabled) throw new BadReqErr(ErrCode.ActionNotAllowed);

    const code = this.deps.mfaService.generateBackupCode();
    const hashedCode = await this.deps.mfaService.hashBackupCode(code);

    await this.deps.mfaService.saveBackupCode(userId, hashedCode);

    await this.deps.auditLogService.pushSecurity(
      createSecurityAuditLog(
        SecurityEventType.mfa_backup_codes_regenerated,
        SecurityEventSeverity.medium,
        AuthMethod.TOTP,
        user,
      ),
      createAuditContext(user.id, {
        visibility: AuditLogVisibility.actor_only,
      }),
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

    assertUserExists(user);

    if (!user.mfaTotpEnabled) throw new BadReqErr(ErrCode.ActionNotAllowed);

    const passwordValid = await this.deps.passwordService.verifyAndTrack(
      password,
      user as any,
    );

    if (!passwordValid) {
      await this.deps.auditLogService.pushSecurity(
        createSecurityAuditLog(
          SecurityEventType.login_failed,
          SecurityEventSeverity.medium,
          AuthMethod.EMAIL,
          user,
          { error: 'password_verification_failed_during_disable_mfa' },
        ),
        createAuditContext(user.id),
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
        createSecurityAuditLog(
          SecurityEventType.mfa_failed,
          SecurityEventSeverity.medium,
          AuthMethod.TOTP,
          user,
          { error: 'invalid_otp_during_disable_mfa' },
        ),
        createAuditContext(user.id),
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
      createSecurityAuditLog(
        SecurityEventType.mfa_disabled,
        SecurityEventSeverity.high,
        AuthMethod.TOTP,
        user,
        { disabledBy: 'user' },
      ),
      createAuditContext(user.id, {
        visibility: AuditLogVisibility.actor_and_subject,
      }),
    );
  }
}

export const authFlowService = new AuthFlowService();
