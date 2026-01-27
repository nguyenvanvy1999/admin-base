import { randomUUID } from 'node:crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import { db, type IDb } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import type {
  AuthChallengeRequestParams,
  AuthEnrollConfirmRequestParams,
  AuthEnrollStartRequestParams,
  AuthEnrollStartResponseDto,
  DisableMfaRequestParams,
  IAuthResponse,
  LoginParams,
  RegenerateBackupCodesResponse,
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
import { getMethodRegistry } from 'src/services/auth/methods/method-registry-init';
import {
  type MfaService,
  mfaService,
} from 'src/services/auth/methods/mfa.service';
import {
  type OtpService,
  otpService,
} from 'src/services/auth/methods/otp.service';
import {
  type PasswordService,
  passwordService,
} from 'src/services/auth/methods/password.service';
import {
  type CaptchaService,
  captchaService,
} from 'src/services/auth/security/captcha.service';
import {
  type SecurityCheckResult,
  type SecurityMonitorService,
  securityMonitorService,
} from 'src/services/auth/security/security-monitor.service';
import {
  type SessionService,
  sessionService,
} from 'src/services/auth/session.service';
import type { AuthMethodContext } from 'src/services/auth/types/auth-method-handler.interface';
import {
  AuthMethod,
  AuthStatus,
  AuthTxState,
  ChallengeType,
} from 'src/services/auth/types/constants';
import { assertUserExists } from 'src/services/auth/utils/auth-errors.util';
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
  ErrCode,
  getIpAndUa,
  PurposeVerify,
  SETTING,
  userResSelect,
} from 'src/share';
import { ChallengeResponseBuilder } from '../builders/challenge-response.builder';
import {
  buildLoginFailedAuditLog,
  buildLoginSuccessAuditLog,
  buildMfaBackupCodesRegeneratedAuditLog,
  buildMfaChallengeStartedAuditLog,
  buildMfaDisabledAuditLog,
  buildMfaFailedAuditLog,
  buildMfaSetupCompletedAuditLog,
  buildMfaSetupStartedAuditLog,
  buildMfaVerifiedAuditLog,
} from '../utils/auth-audit.helper';
import { type AuthTxService, authTxService } from './auth-tx.service';
import { type AuthUserService, authUserService } from './auth-user.service';
import { ChallengeResolverService } from './challenge-resolver.service';
import { LoginStepsService } from './login-steps.service';

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
      captchaService: CaptchaService;
      sessionService: SessionService;
      otpService: OtpService;
      mfaService: MfaService;
      challengeResponseBuilder: ChallengeResponseBuilder;
      challengeResolver: ChallengeResolverService;
      loginSteps: LoginStepsService;
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
      captchaService,
      sessionService,
      otpService,
      mfaService,
      challengeResponseBuilder: new ChallengeResponseBuilder(),
      challengeResolver: new ChallengeResolverService(),
      loginSteps: new LoginStepsService({
        passwordService,
        captchaService,
        securityMonitorService,
      }),
    },
  ) {}

  resolveNextStep(input: {
    user: { mfaTotpEnabled: boolean };
    mfaRequired: boolean;
    riskBased?: boolean;
    risk?: 'LOW' | 'MEDIUM' | 'HIGH';
    isNewDevice?: boolean;
    deviceVerificationEnabled?: boolean;
  }): ChallengeType | null {
    const {
      user,
      mfaRequired,
      riskBased,
      risk,
      isNewDevice,
      deviceVerificationEnabled,
    } = input;

    if (!user.mfaTotpEnabled && isNewDevice && deviceVerificationEnabled) {
      return ChallengeType.DEVICE_VERIFY;
    }

    if (mfaRequired && !user.mfaTotpEnabled) return ChallengeType.MFA_REQUIRED;
    if (user.mfaTotpEnabled) return ChallengeType.MFA_REQUIRED;

    if (riskBased && (risk === 'MEDIUM' || risk === 'HIGH')) {
      return ChallengeType.MFA_REQUIRED;
    }

    return null;
  }

  private async logLoginFailure(
    user: { id: string; email: string | null },
    reason: string,
    severity?: SecurityEventSeverity,
  ): Promise<void> {
    await this.deps.auditLogService.pushSecurity(
      buildLoginFailedAuditLog(user, AuthMethod.EMAIL, reason, {
        userId: user.id,
        ...(severity && { severity }),
      }),
      { userId: user.id, subjectUserId: user.id },
    );
  }

  private async validateLoginInput(
    params: LoginParams,
    user: {
      id: string;
      email: string | null;
      status: UserStatus;
      password: string;
      passwordAttempt: number;
      passwordExpired: Date | null;
    },
    settings: {
      captchaRequired: boolean;
      enbAttempt: boolean;
      passwordMaxAttempt: number;
      enbExpired: boolean;
    },
  ): Promise<void> {
    const { captcha, password } = params;
    const { captchaRequired, enbAttempt, passwordMaxAttempt, enbExpired } =
      settings;

    if (captchaRequired && !captcha) {
      await this.logLoginFailure(user, 'captcha_required');
      throw new BadReqErr(ErrCode.CaptchaRequired);
    }

    try {
      await this.deps.loginSteps.validateCaptcha(captcha);
    } catch (error) {
      if (error instanceof BadReqErr && error.code === ErrCode.InvalidCaptcha) {
        await this.logLoginFailure(user, 'invalid_captcha');
      }
      throw error;
    }

    const passwordValid = await this.deps.loginSteps.validatePassword(
      password,
      user,
      enbAttempt ? passwordMaxAttempt : undefined,
    );

    if (!passwordValid) {
      await this.logLoginFailure(user, 'password_mismatch');
      throw new BadReqErr(ErrCode.InvalidCredentials);
    }

    if (user.status !== UserStatus.active) {
      await this.logLoginFailure(user, 'user_not_active');
      throw new BadReqErr(ErrCode.UserNotActive);
    }

    if (enbExpired) {
      this.deps.passwordService.validateExpiration(user);
    }
  }

  private async handleCompleteLogin(
    user: Awaited<
      ReturnType<typeof this.deps.userUtilService.findUserForLogin>
    >,
    securityResult: SecurityCheckResult,
  ): Promise<IAuthResponse> {
    const { clientIp, userAgent } = getIpAndUa();
    const session = await this.deps.userUtilService.completeLogin(
      user,
      clientIp,
      userAgent,
      securityResult,
    );

    await this.deps.auditLogService.pushSecurity(
      buildLoginSuccessAuditLog(user, AuthMethod.EMAIL, {
        userId: user.id,
        sessionId: session.sessionId,
        isNewDevice: securityResult?.isNewDevice ?? false,
      }),
      {
        userId: user.id,
        sessionId: session.sessionId ?? null,
        subjectUserId: user.id,
      },
    );

    return { status: AuthStatus.COMPLETED, session };
  }

  private async handleDeviceVerifyChallenge(
    user: {
      id: string;
      email: string | null;
      status: UserStatus;
      mfaTotpEnabled: boolean;
    },
    authTx: { id: string },
    securityResult?: SecurityCheckResult,
  ): Promise<IAuthResponse> {
    if (!user.email)
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: 'User email is required',
      });

    const res = await this.deps.otpService.sendOtpWithAudit(
      user.email,
      PurposeVerify.DEVICE_VERIFY,
    );
    if (!res) throw new BadReqErr(ErrCode.InternalError);

    await this.deps.authTxService.update(authTx.id, {
      ...(res.otpToken && { deviceVerifyToken: res.otpToken }),
      state: AuthTxState.CHALLENGE,
      challengeType: ChallengeType.DEVICE_VERIFY,
    });

    const updatedTx = await this.deps.authTxService.getOrThrow(authTx.id);
    const availableMethods =
      await this.deps.challengeResolver.resolveAvailableMethods({
        user: { ...user, email: user.email || '' },
        authTx: updatedTx,
        securityResult,
        challengeType: ChallengeType.DEVICE_VERIFY,
      });

    const challenge = this.deps.challengeResponseBuilder.buildDeviceVerify({
      user: { ...user, email: user.email || '' },
      availableMethods,
      securityResult,
    });

    return {
      status: AuthStatus.CHALLENGE,
      authTxId: authTx.id,
      challenge,
    };
  }

  private async handleMfaChallenge(
    user: {
      id: string;
      email: string | null;
      status: UserStatus;
      mfaTotpEnabled: boolean;
    },
    authTx: { id: string },
    mfaRequired: boolean,
    securityResult?: SecurityCheckResult,
  ): Promise<IAuthResponse> {
    await this.deps.authTxService.update(authTx.id, {
      state: AuthTxState.CHALLENGE,
      challengeType: ChallengeType.MFA_REQUIRED,
    });

    if (!user.mfaTotpEnabled && mfaRequired && user.email) {
      const res = await this.deps.otpService.sendOtpWithAudit(
        user.email,
        PurposeVerify.MFA_LOGIN,
      );
      if (res) {
        await this.deps.authTxService.update(authTx.id, {
          emailOtpToken: res.otpToken,
        });
      }
    }

    await this.deps.auditLogService.pushSecurity(
      buildMfaChallengeStartedAuditLog(user, AuthMethod.EMAIL, {
        userId: user.id,
        metadata: {
          stage: 'challenge',
          from: 'login',
          method: user.mfaTotpEnabled ? 'totp_available' : 'email_otp_fallback',
        },
      }),
      {
        userId: user.id,
        subjectUserId: user.id,
        visibility: AuditLogVisibility.actor_and_subject,
      },
    );

    const finalTx = await this.deps.authTxService.getOrThrow(authTx.id);
    const availableMethods =
      await this.deps.challengeResolver.resolveAvailableMethods({
        user: { ...user, email: user.email || '' },
        authTx: finalTx,
        securityResult,
        challengeType: ChallengeType.MFA_REQUIRED,
      });

    const challenge = await this.deps.challengeResponseBuilder.buildMfaRequired(
      {
        user: { ...user, email: user.email || '' },
        availableMethods,
      },
    );

    return {
      status: AuthStatus.CHALLENGE,
      authTxId: authTx.id,
      challenge,
    };
  }

  async startLogin(params: LoginParams): Promise<IAuthResponse> {
    const { email } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const user = await this.deps.userUtilService.findUserForLogin(email);

    const [
      captchaRequired,
      enbAttempt,
      passwordMaxAttempt,
      enbExpired,
      mfaRequired,
      mfaRiskBased,
      deviceVerificationEnabled,
    ] = await this.deps.settingService.getManySettings([
      SETTING.ENB_CAPTCHA_REQUIRED,
      SETTING.ENB_PASSWORD_ATTEMPT,
      SETTING.PASSWORD_MAX_ATTEMPT,
      SETTING.ENB_PASSWORD_EXPIRED,
      SETTING.ENB_MFA_REQUIRED,
      SETTING.ENB_MFA_RISK_BASED,
      SETTING.ENB_DEVICE_VERIFICATION,
    ]);

    await this.validateLoginInput(params, user, {
      captchaRequired,
      enbAttempt,
      passwordMaxAttempt,
      enbExpired,
    });

    const securityResult = await this.deps.loginSteps.evaluateSecurity(
      user,
      'email',
    );

    if (securityResult.action === 'block') {
      await this.logLoginFailure(
        user,
        'security_blocked',
        SecurityEventSeverity.high,
      );
      throw new BadReqErr(ErrCode.LoginBlocked);
    }

    const authTx = await this.deps.authTxService.create(
      user.id,
      AuthTxState.PASSWORD_VERIFIED,
      { ip: clientIp, ua: userAgent },
      securityResult,
    );

    const challengeType = this.resolveNextStep({
      user: { mfaTotpEnabled: user.mfaTotpEnabled },
      mfaRequired,
      riskBased: mfaRiskBased,
      risk: securityResult.risk,
      isNewDevice: securityResult.isNewDevice,
      deviceVerificationEnabled,
    });

    if (!challengeType) {
      await this.deps.authTxService.delete(authTx.id);
      return this.handleCompleteLogin(user, securityResult);
    }

    if (challengeType === ChallengeType.DEVICE_VERIFY) {
      return this.handleDeviceVerifyChallenge(user, authTx, securityResult);
    }

    if (challengeType === ChallengeType.MFA_REQUIRED) {
      return this.handleMfaChallenge(user, authTx, mfaRequired, securityResult);
    }

    throw new BadReqErr(ErrCode.InternalError, {
      errors: `Unexpected challenge type: ${challengeType}`,
    });
  }

  async completeChallenge(
    params: AuthChallengeRequestParams,
  ): Promise<IAuthResponse> {
    const { authTxId, method, code } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const tx = await this.deps.authTxService.getOrThrow(authTxId);
    this.deps.authTxService.assertBinding(tx, { ip: clientIp, ua: userAgent });

    if (tx.state !== AuthTxState.CHALLENGE || !tx.challengeType) {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: 'Invalid auth transaction state',
      });
    }

    this.deps.authTxService.assertChallengeAttemptsAllowed(tx);

    const user = await this.deps.authUserService.loadUserForAuth(tx.userId);
    const registry = getMethodRegistry();
    const handler = registry.getHandler(method);

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
        buildMfaFailedAuditLog(
          user,
          registry.getAuthMethod(method) as AuthMethod,
          'invalid_mfa_code',
          { userId: user.id },
        ),
        { userId: user.id, subjectUserId: user.id },
      );
      throw new BadReqErr(result.errorCode || ErrCode.InvalidOtp);
    }

    await this.deps.authTxService.delete(authTxId);

    const session = await this.deps.userUtilService.completeLogin(
      user,
      clientIp,
      userAgent,
      tx.securityResult,
    );

    await this.deps.auditLogService.pushSecurity(
      buildMfaVerifiedAuditLog(
        user,
        registry.getAuthMethod(method) as AuthMethod,
        {
          userId: user.id,
          sessionId: session.sessionId,
        },
      ),
      {
        userId: user.id,
        sessionId: session.sessionId ?? null,
        subjectUserId: user.id,
      },
    );

    return { status: AuthStatus.COMPLETED, session };
  }

  async getChallengeMethods(authTxId: string) {
    const { clientIp, userAgent } = getIpAndUa();

    const tx = await this.deps.authTxService.getOrThrow(authTxId);
    this.deps.authTxService.assertBinding(tx, { ip: clientIp, ua: userAgent });

    if (tx.state !== AuthTxState.CHALLENGE || !tx.challengeType) {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: 'Invalid auth transaction state',
      });
    }

    const user = await this.deps.authUserService.loadUserForAuth(tx.userId);

    return this.deps.challengeResolver.resolveAvailableMethods({
      user,
      authTx: tx,
      securityResult: tx.securityResult,
      challengeType: tx.challengeType,
    });
  }

  async enrollStart(params: AuthEnrollStartRequestParams) {
    const { authTxId } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const tx = await this.deps.authTxService.getOrThrow(authTxId);
    this.deps.authTxService.assertBinding(tx, { ip: clientIp, ua: userAgent });

    if (
      tx.state !== AuthTxState.CHALLENGE ||
      tx.challengeType !== ChallengeType.MFA_ENROLL
    ) {
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

    const tempSecret = generateSecret().toUpperCase();
    const otpauthUrl = generateURI({
      issuer: user.email ?? user.id,
      label: 'Admin Base Portal',
      secret: tempSecret,
    });

    const enrollToken = randomUUID();

    await this.deps.authTxService.attachEnroll(authTxId, {
      enrollToken,
      tempTotpSecret: tempSecret,
      startedAt: Date.now(),
    });

    await this.deps.auditLogService.pushSecurity(
      buildMfaSetupStartedAuditLog(user, AuthMethod.TOTP, 'request', {
        userId: user.id,
      }),
      { userId: user.id, subjectUserId: user.id },
    );

    return { authTxId, enrollToken, otpauthUrl };
  }

  async enrollStartForAuthenticatedUser(
    userId: string,
  ): Promise<typeof AuthEnrollStartResponseDto.static> {
    const { clientIp, userAgent } = getIpAndUa();

    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaTotpEnabled: true },
    });
    assertUserExists(user);
    if (user.mfaTotpEnabled) throw new BadReqErr(ErrCode.MFAHasBeenSetup);

    const authTx = await this.deps.authTxService.create(
      userId,
      AuthTxState.CHALLENGE,
      { ip: clientIp, ua: userAgent },
      undefined,
      ChallengeType.MFA_ENROLL,
    );

    return await this.enrollStart({ authTxId: authTx.id });
  }

  async enrollConfirmForAuthenticatedUser(
    params: AuthEnrollConfirmRequestParams,
  ): Promise<{ backupCodes: string[] }> {
    const { authTxId, enrollToken, otp } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const tx = await this.deps.authTxService.getOrThrow(authTxId);
    this.deps.authTxService.assertBinding(tx, { ip: clientIp, ua: userAgent });

    if (
      tx.state !== AuthTxState.CHALLENGE ||
      tx.challengeType !== ChallengeType.MFA_ENROLL
    ) {
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

    const otpOk = await verify({
      secret: tx.enroll.tempTotpSecret,
      token: otp,
    });

    if (!otpOk.valid) {
      await this.deps.authTxService.incrementChallengeAttempts(authTxId);
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    const code = this.deps.mfaService.generateBackupCode();
    const [hash, userResult] = await Promise.all([
      this.deps.mfaService.hashBackupCode(code),
      this.deps.db.user.update({
        where: { id: tx.userId },
        data: {
          totpSecret: tx.enroll.tempTotpSecret,
          mfaTotpEnabled: true,
          mfaEnrollRequired: false,
        },
        select: userResSelect,
      }),
    ]);
    await this.deps.mfaService.saveBackupCode(tx.userId, hash);

    if (userResult.status !== UserStatus.active) {
      throw new BadReqErr(ErrCode.UserNotActive);
    }

    await this.deps.authTxService.delete(authTxId);

    await this.deps.auditLogService.pushSecurity(
      buildMfaSetupCompletedAuditLog(userResult, AuthMethod.TOTP, {
        userId: userResult.id,
      }),
      { userId: userResult.id, subjectUserId: userResult.id },
    );

    return { backupCodes: [code] };
  }

  async regenerateBackupCodes(
    userId: string,
  ): Promise<RegenerateBackupCodesResponse> {
    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaTotpEnabled: true },
    });

    assertUserExists(user);
    if (!user.mfaTotpEnabled) throw new BadReqErr(ErrCode.ActionNotAllowed);

    const code = this.deps.mfaService.generateBackupCode();
    const hashedCode = await this.deps.mfaService.hashBackupCode(code);

    await this.deps.mfaService.saveBackupCode(userId, hashedCode);

    await this.deps.auditLogService.pushSecurity(
      buildMfaBackupCodesRegeneratedAuditLog(user, {
        userId: user.id,
      }),
      {
        userId: user.id,
        subjectUserId: user.id,
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

    assertUserExists(user);

    if (!user.mfaTotpEnabled) throw new BadReqErr(ErrCode.ActionNotAllowed);

    const passwordValid = await this.deps.passwordService.verifyAndTrack(
      password,
      user,
    );

    if (!passwordValid) {
      await this.deps.auditLogService.pushSecurity(
        buildLoginFailedAuditLog(
          user,
          AuthMethod.EMAIL,
          'password_verification_failed_during_disable_mfa',
          { userId: user.id },
        ),
        { userId: user.id, subjectUserId: user.id },
      );
      throw new BadReqErr(ErrCode.PasswordNotMatch);
    }

    if (!user.totpSecret) throw new BadReqErr(ErrCode.MfaBroken);

    try {
      const otpOk = await verify({
        secret: user.totpSecret,
        token: code,
      });
      if (!otpOk.valid) throw new Error('Invalid OTP');
    } catch {
      await this.deps.auditLogService.pushSecurity(
        buildMfaFailedAuditLog(
          user,
          AuthMethod.TOTP,
          'invalid_otp_during_disable_mfa',
          { userId: user.id },
        ),
        { userId: user.id, subjectUserId: user.id },
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

    await Promise.allSettled([
      this.deps.sessionService.revoke(userId),
      this.deps.auditLogService.pushSecurity(
        buildMfaDisabledAuditLog(user, AuthMethod.TOTP, 'user', {
          userId: user.id,
        }),
        {
          userId: user.id,
          subjectUserId: user.id,
          visibility: AuditLogVisibility.actor_and_subject,
        },
      ),
    ]);
  }
}

export const authFlowService = new AuthFlowService();
