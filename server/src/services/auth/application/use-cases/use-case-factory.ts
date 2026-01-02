import { authenticator } from 'otplib';
import { db } from 'src/config/db';
import { env } from 'src/config/env';
import { geoIPQueue } from 'src/config/queue';
import { auditLogsService } from 'src/services/audit-logs/audit-logs.service';
import { settingsService } from 'src/services/settings/settings.service';
import { idUtil } from 'src/share';
import { ChallengeResponseBuilder } from '../../builders/challenge-response.builder';
import { authUserService } from '../../core/auth-user.service';
import { ChallengeResolverService } from '../../core/challenge-resolver.service';
import { SessionService } from '../../domain/services/session.service';
import { jwtProvider } from '../../infrastructure/providers/jwt.provider';
import { authTxRepository } from '../../infrastructure/repositories/auth-tx.repository';
import { sessionRepository } from '../../infrastructure/repositories/session.repository';
import { mfaService } from '../../methods/mfa.service';
import { otpService } from '../../methods/otp.service';
import { passwordService } from '../../methods/password.service';
import { captchaService } from '../../security/captcha.service';
import { securityMonitorService } from '../../security/security-monitor.service';
import { userUtilService } from '../../utils/auth-util.service';
import { ChangePasswordUseCase } from './change-password.use-case';
import { CompleteChallengeUseCase } from './complete-challenge.use-case';
import { ForgotPasswordUseCase } from './forgot-password.use-case';
import { GetChallengeMethodsUseCase } from './get-challenge-methods.use-case';
import { LoginUseCase } from './login.use-case';
import { LogoutAllUseCase, LogoutUseCase } from './logout.use-case';
import {
  MfaEnrollConfirmUseCase,
  MfaEnrollStartUseCase,
} from './mfa-enroll.use-case';
import {
  DisableMfaUseCase,
  RegenerateBackupCodesUseCase,
} from './mfa-management.use-case';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { RegisterUseCase } from './register.use-case';
import { VerifyAccountUseCase } from './verify-account.use-case';

const sessionDomainService = new SessionService({
  db,
  tokenService: jwtProvider,
  userUtilService,
  settingService: settingsService as any,
  geoIPQueue,
  idUtil,
  env,
  sessionRepository,
});

export const useCaseFactory = {
  register: new RegisterUseCase({
    db,
    userUtilService,
    otpService: otpService,
    auditLogService: auditLogsService as any,
  }),

  verifyAccount: new VerifyAccountUseCase({
    db,
    otpService: otpService,
    auditLogService: auditLogsService as any,
  }),

  changePassword: new ChangePasswordUseCase({
    db,
    passwordService,
    sessionService: sessionDomainService,
    settingService: settingsService as any,
    auditLogService: auditLogsService as any,
  }),

  forgotPassword: new ForgotPasswordUseCase({
    db,
    otpService: otpService,
    passwordService,
    sessionService: sessionDomainService,
    auditLogService: auditLogsService as any,
  }),

  refreshToken: new RefreshTokenUseCase({
    sessionService: sessionDomainService,
    tokenService: jwtProvider,
    authUserService,
    auditLogService: auditLogsService as any,
  }),

  logout: new LogoutUseCase({
    sessionService: sessionDomainService,
    auditLogService: auditLogsService as any,
  }),

  logoutAll: new LogoutAllUseCase({
    sessionService: sessionDomainService,
    auditLogService: auditLogsService as any,
  }),

  login: new LoginUseCase({
    userUtilService,
    passwordService,
    captchaService,
    securityMonitorService,
    settingService: settingsService as any,
    auditLogService: auditLogsService as any,
    authTxRepository: authTxRepository,
    sessionService: sessionDomainService,
    otpService: otpService,
    challengeResponseBuilder: new ChallengeResponseBuilder(),
    challengeResolver: new ChallengeResolverService(),
  }),

  completeChallenge: new CompleteChallengeUseCase({
    authTxRepository: authTxRepository,
    authUserService,
    sessionService: sessionDomainService,
    auditLogService: auditLogsService as any,
  }),

  mfaEnrollStart: new MfaEnrollStartUseCase({
    db,
    authTxRepository: authTxRepository,
    auditLogService: auditLogsService as any,
    authenticator,
  }),

  mfaEnrollConfirm: new MfaEnrollConfirmUseCase({
    db,
    authTxRepository: authTxRepository,
    mfaService,
    auditLogService: auditLogsService as any,
    authenticator,
  }),

  regenerateBackupCodes: new RegenerateBackupCodesUseCase({
    db,
    mfaService,
    auditLogService: auditLogsService as any,
  }),

  disableMfa: new DisableMfaUseCase({
    db,
    passwordService,
    sessionService: sessionDomainService,
    auditLogService: auditLogsService as any,
    authenticator,
  }),

  getChallengeMethods: new GetChallengeMethodsUseCase({
    authTxRepository: authTxRepository,
    authUserService,
    challengeResolver: new ChallengeResolverService(),
  }),
};
