import type { IAuthResponse, LoginParams } from 'src/dtos/auth.dto';
import {
  AuditLogVisibility,
  SecurityEventSeverity,
  UserStatus,
} from 'src/generated';
import {
  BadReqErr,
  ErrCode,
  getIpAndUa,
  PurposeVerify,
  SETTING,
} from 'src/share';
import type { ChallengeResponseBuilder } from '../../builders/challenge-response.builder';
import type { ChallengeResolverService } from '../../core/challenge-resolver.service';
import type { IAuditLogService } from '../../domain/interfaces/audit-log.service.interface';
import type { ICaptchaService } from '../../domain/interfaces/captcha.service.interface';
import type { IOtpService } from '../../domain/interfaces/otp.service.interface';
import type { IPasswordService } from '../../domain/interfaces/password.service.interface';
import type { ISecurityMonitorService } from '../../domain/interfaces/security-monitor.service.interface';
import type { ISessionService } from '../../domain/interfaces/session.service.interface';
import type { ISettingsService } from '../../domain/interfaces/settings.service.interface';
import type { IUserUtilService } from '../../domain/interfaces/user-util.service.interface';
import {
  AuthEvent,
  AuthStateMachine,
} from '../../domain/state-machine/auth-state-machine';
import type { IAuthTxRepository } from '../../infrastructure/repositories/auth-tx.repository';
import {
  AuthMethod,
  AuthStatus,
  AuthTxState,
  ChallengeType,
} from '../../types/constants';
import {
  buildLoginFailedAuditLog,
  buildLoginSuccessAuditLog,
  buildMfaChallengeStartedAuditLog,
} from '../../utils/auth-audit.helper';

export class LoginUseCase {
  private stateMachine: AuthStateMachine;

  constructor(
    private readonly deps: {
      userUtilService: IUserUtilService;
      passwordService: IPasswordService;
      captchaService: ICaptchaService;
      securityMonitorService: ISecurityMonitorService;
      settingService: ISettingsService;
      auditLogService: IAuditLogService;
      authTxRepository: IAuthTxRepository;
      sessionService: ISessionService;
      otpService: IOtpService;
      challengeResponseBuilder: ChallengeResponseBuilder;
      challengeResolver: ChallengeResolverService;
    },
  ) {
    this.stateMachine = new AuthStateMachine();
  }

  async execute(params: LoginParams): Promise<IAuthResponse> {
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

    await this.validateLoginInput(params, user as any, {
      captchaRequired,
      enbAttempt,
      passwordMaxAttempt,
      enbExpired,
    });

    const securityResult = await this.deps.securityMonitorService.evaluateLogin(
      {
        userId: user.id,
        method: 'email',
      },
    );

    if (securityResult.action === 'block') {
      await this.logLoginFailure(
        user,
        'security_blocked',
        SecurityEventSeverity.high,
      );
      throw new BadReqErr(ErrCode.LoginBlocked);
    }

    this.stateMachine.transition(AuthEvent.PASSWORD_VERIFIED);

    const authTx = await this.deps.authTxRepository.create(
      user.id,
      AuthTxState.PASSWORD_VERIFIED,
      { ip: clientIp, ua: userAgent },
      securityResult,
    );

    const challengeType = this.stateMachine.resolveNextChallenge({
      mfaTotpEnabled: user.mfaTotpEnabled,
      mfaRequired,
      riskBased: mfaRiskBased,
      risk: securityResult.risk,
      isNewDevice: securityResult.isNewDevice,
      deviceVerificationEnabled,
    });

    if (!challengeType) {
      await this.deps.authTxRepository.delete(authTx.id);
      this.stateMachine.transition(AuthEvent.LOGIN_COMPLETED);
      return this.handleCompleteLogin(user as any, securityResult);
    }

    this.stateMachine.setChallengeType(challengeType);
    this.stateMachine.transition(AuthEvent.CHALLENGE_REQUIRED);

    if (challengeType === ChallengeType.DEVICE_VERIFY) {
      return this.handleDeviceVerifyChallenge(
        user as any,
        authTx,
        securityResult,
      );
    }

    if (challengeType === ChallengeType.MFA_REQUIRED) {
      return this.handleMfaChallenge(
        user as any,
        authTx,
        mfaRequired,
        securityResult,
      );
    }

    throw new BadReqErr(ErrCode.InternalError, {
      errors: `Unexpected challenge type: ${challengeType}`,
    });
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

    if (captcha) {
      try {
        const captchaValid = await this.deps.captchaService.validateCaptcha({
          token: captcha.token,
          userInput: captcha.userInput,
        });
        if (!captchaValid) {
          await this.logLoginFailure(user, 'invalid_captcha');
          throw new BadReqErr(ErrCode.InvalidCaptcha);
        }
      } catch (error) {
        if (
          error instanceof BadReqErr &&
          error.code === ErrCode.InvalidCaptcha
        ) {
          await this.logLoginFailure(user, 'invalid_captcha');
        }
        throw error;
      }
    }

    if (enbAttempt) {
      this.deps.passwordService.validateAttempt(user, passwordMaxAttempt);
    }

    const passwordValid = await this.deps.passwordService.verifyAndTrack(
      password,
      user,
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

  private async handleCompleteLogin(
    user: any,
    securityResult: any,
  ): Promise<IAuthResponse> {
    const session = await this.deps.sessionService.create(
      user,
      getIpAndUa().clientIp,
      getIpAndUa().userAgent,
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
    securityResult?: any,
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

    await this.deps.authTxRepository.update(authTx.id, {
      deviceVerifyToken: res.otpToken,
      state: AuthTxState.CHALLENGE,
      challengeType: ChallengeType.DEVICE_VERIFY,
    });

    const updatedTx = await this.deps.authTxRepository.getOrThrow(authTx.id);
    const availableMethods =
      await this.deps.challengeResolver.resolveAvailableMethods({
        user: { ...user, email: user.email || '' },
        authTx: updatedTx as any,
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
    securityResult?: any,
  ): Promise<IAuthResponse> {
    await this.deps.authTxRepository.update(authTx.id, {
      state: AuthTxState.CHALLENGE,
      challengeType: ChallengeType.MFA_REQUIRED,
    });

    if (!user.mfaTotpEnabled && mfaRequired && user.email) {
      const res = await this.deps.otpService.sendOtpWithAudit(
        user.email,
        PurposeVerify.MFA_LOGIN,
      );
      if (res) {
        await this.deps.authTxRepository.update(authTx.id, {
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

    const finalTx = await this.deps.authTxRepository.getOrThrow(authTx.id);
    const availableMethods =
      await this.deps.challengeResolver.resolveAvailableMethods({
        user: { ...user, email: user.email || '' },
        authTx: finalTx as any,
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
}
