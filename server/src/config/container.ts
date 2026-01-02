import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { Container } from '@findhow/container';
import { OAuth2Client } from 'google-auth-library';
import { authenticator } from 'otplib';
// Other service imports
import { AuditLogsService } from 'src/services/audit-logs/audit-logs.service';
// Auth service imports - Layer 3 (complex services)
import { ChallengeResponseBuilder } from 'src/services/auth/builders/challenge-response.builder';
// Auth service imports - Layer 4 (most complex services)
import { AuthService } from 'src/services/auth/core/auth.service';
import { AuthFlowService } from 'src/services/auth/core/auth-flow.service';
import { AuthTxService } from 'src/services/auth/core/auth-tx.service';
import { AuthUserService } from 'src/services/auth/core/auth-user.service';
import { ChallengeResolverService } from 'src/services/auth/core/challenge-resolver.service';
import { LoginStepsService } from 'src/services/auth/core/login-steps.service';
import type { MethodRegistryService } from 'src/services/auth/methods/method-registry.service';
import { getMethodRegistry } from 'src/services/auth/methods/method-registry-init';
import { MfaService } from 'src/services/auth/methods/mfa.service';
import { OtpService } from 'src/services/auth/methods/otp.service';
import {
  BunPasswordHasher,
  PasswordService,
} from 'src/services/auth/methods/password.service';
import { OAuthService } from 'src/services/auth/providers/oauth.service';
import { CaptchaService } from 'src/services/auth/security/captcha.service';
// Auth service imports - Layer 1 (simple services)
import { EncryptService } from 'src/services/auth/security/encrypt.service';
import { SecurityMonitorService } from 'src/services/auth/security/security-monitor.service';
import { SessionService } from 'src/services/auth/session.service';
import { AuthMiddlewareService } from 'src/services/auth/utils/auth-middleware.service';
// Auth service imports - Layer 2 (medium services)
import {
  TokenService,
  UserUtilService,
} from 'src/services/auth/utils/auth-util.service';
import { type LockingService, lockingService } from 'src/services/misc';
import { SettingsService } from 'src/services/settings/settings.service';
// Share imports
import { type IdUtil, idUtil } from 'src/share';
import { ctxStore } from 'src/share/context/request-context';
import svgCaptcha from 'svg-captcha';
import {
  authTxCache,
  captchaCache,
  currentUserCache,
  type IAuthTxCache,
  type ICaptchaCache,
  type IOTPCache,
  type IOtpRateLimitCache,
  type ISettingCache,
  otpCache,
  otpRateLimitCache,
  type RedisCache,
  registerOtpLimitCache,
  settingCache,
} from './cache';
// Core config imports
import { db, type IDb } from './db';
import { env, type IEnv } from './env';
import {
  emailQueue,
  geoIPQueue,
  type IEmailQueue,
  type IGeoIPQueue,
} from './queue';

const container = new Container();

// ============================================
// Core Dependencies
// ============================================
container.instance('IDb', db);
container.instance('IEnv', env);
container.instance('IdUtil', idUtil);

// ============================================
// Cache Dependencies
// ============================================
container.instance('IAuthTxCache', authTxCache);
container.instance('ICaptchaCache', captchaCache);
container.instance('IOTPCache', otpCache);
container.instance('IOtpRateLimitCache', otpRateLimitCache);
container.instance('RegisterOtpLimitCache', registerOtpLimitCache);
container.instance('ISettingCache', settingCache);
container.instance('CurrentUserCache', currentUserCache);

// ============================================
// Queue Dependencies
// ============================================
container.instance('IEmailQueue', emailQueue);
container.instance('IGeoIPQueue', geoIPQueue);

// ============================================
// Utility Services
// ============================================
container.instance('LockingService', lockingService);

// ============================================
// Layer 1: Simple Services (no or minimal dependencies)
// ============================================
container.singleton(EncryptService, (c: Container) => {
  const env = c.resolve<IEnv>('IEnv');
  return new EncryptService(env);
});

container.singleton(BunPasswordHasher, () => new BunPasswordHasher());

container.singleton(SessionService, (c: Container) => {
  const db = c.resolve<IDb>('IDb');
  return new SessionService({ db });
});

container.singleton(AuthTxService, (c: Container) => {
  const cache = c.resolve<IAuthTxCache>('IAuthTxCache');
  return new AuthTxService(cache, 300);
});

container.singleton(CaptchaService, (c: Container) => {
  const cache = c.resolve<ICaptchaCache>('ICaptchaCache');
  const idUtil = c.resolve<IdUtil>('IdUtil');
  return new CaptchaService({
    cache,
    svg: svgCaptcha,
    idUtil,
  });
});

// ============================================
// Layer 2: Medium Services
// ============================================
container.singleton(TokenService, (c: Container) => {
  const env = c.resolve<IEnv>('IEnv');
  const idUtil = c.resolve<IdUtil>('IdUtil');
  const encryptService = c.resolve<EncryptService>(EncryptService);
  return new TokenService(env, idUtil, encryptService);
});

container.singleton(AuditLogsService, (c: Container) => {
  const idUtil = c.resolve<IdUtil>('IdUtil');
  return new AuditLogsService({ idUtil });
});

container.singleton(SettingsService, (c: Container) => {
  const db = c.resolve<IDb>('IDb');
  const cache = c.resolve<ISettingCache>('ISettingCache');
  const auditLogService = c.resolve<AuditLogsService>(AuditLogsService);
  const encryptService = c.resolve<EncryptService>(EncryptService);
  return new SettingsService({
    db,
    cache,
    auditLogService,
    encryptService,
  });
});

container.singleton(PasswordService, (c: Container) => {
  const env = c.resolve<IEnv>('IEnv');
  const db = c.resolve<IDb>('IDb');
  const passwordHasher = c.resolve<BunPasswordHasher>(BunPasswordHasher);
  const settingsService = c.resolve<SettingsService>(SettingsService);
  return new PasswordService({
    env,
    db,
    passwordHasher,
    settingsService,
  });
});

container.singleton(OtpService, (c: Container) => {
  const db = c.resolve<IDb>('IDb');
  const otpCache = c.resolve<IOTPCache>('IOTPCache');
  const otpRateLimitCache = c.resolve<IOtpRateLimitCache>('IOtpRateLimitCache');
  const registerOtpLimitCache = c.resolve<RedisCache<number>>(
    'RegisterOtpLimitCache',
  );
  const lockingService = c.resolve<LockingService>('LockingService');
  const emailQueue = c.resolve<IEmailQueue>('IEmailQueue');
  const auditLogService = c.resolve<AuditLogsService>(AuditLogsService);
  const settingService = c.resolve<SettingsService>(SettingsService);
  const idUtil = c.resolve<IdUtil>('IdUtil');
  return new OtpService({
    db,
    otpCache,
    otpRateLimitCache,
    registerOtpLimitCache,
    lockingService,
    emailQueue,
    auditLogService,
    settingService,
    idUtil,
  });
});

container.singleton(MfaService, (c: Container) => {
  const db = c.resolve<IDb>('IDb');
  const otpService = c.resolve<OtpService>(OtpService);
  const idUtil = c.resolve<IdUtil>('IdUtil');
  return new MfaService({
    db,
    otpService,
    idUtil,
  });
});

container.singleton(SecurityMonitorService, (c: Container) => {
  const db = c.resolve<IDb>('IDb');
  const auditLogService = c.resolve<AuditLogsService>(AuditLogsService);
  const settingService = c.resolve<SettingsService>(SettingsService);
  return new SecurityMonitorService({
    db,
    auditLogService,
    settingService,
  });
});

// ============================================
// Layer 3: Complex Services
// ============================================
container.singleton(ChallengeResponseBuilder, (c: Container) => {
  const db = c.resolve<IDb>('IDb');
  const mfaService = c.resolve<MfaService>(MfaService);
  return new ChallengeResponseBuilder({
    db,
    mfaService,
  });
});

container.instance('MethodRegistryService', getMethodRegistry());

container.singleton(ChallengeResolverService, (c: Container) => {
  const methodRegistry = c.resolve<MethodRegistryService>(
    'MethodRegistryService',
  );
  return new ChallengeResolverService({
    methodRegistry,
  });
});

container.singleton(LoginStepsService, (c: Container) => {
  const passwordService = c.resolve<PasswordService>(PasswordService);
  const captchaService = c.resolve<CaptchaService>(CaptchaService);
  const securityMonitorService = c.resolve<SecurityMonitorService>(
    SecurityMonitorService,
  );
  return new LoginStepsService({
    passwordService,
    captchaService,
    securityMonitorService,
  });
});

container.singleton(UserUtilService, (c: Container) => {
  const db = c.resolve<IDb>('IDb');
  const tokenService = c.resolve<TokenService>(TokenService);
  const sessionService = c.resolve<SessionService>(SessionService);
  const settingService = c.resolve<SettingsService>(SettingsService);
  const geoIPQueue = c.resolve<IGeoIPQueue>('IGeoIPQueue');
  const passwordService = c.resolve<PasswordService>(PasswordService);
  const idUtil = c.resolve<IdUtil>('IdUtil');
  return new UserUtilService({
    db,
    tokenService,
    sessionService,
    settingService,
    geoIPQueue,
    passwordService,
    idUtil,
  });
});

container.singleton(AuthUserService, (c: Container) => {
  const db = c.resolve<IDb>('IDb');
  const userUtilService = c.resolve<UserUtilService>(UserUtilService);
  return new AuthUserService({
    db,
    userUtilService,
  });
});

container.singleton(AuthMiddlewareService, (c: Container) => {
  const tokenService = c.resolve<TokenService>(TokenService);
  const authUserService = c.resolve<AuthUserService>(AuthUserService);
  const currentUserCacheValue =
    c.resolve<typeof currentUserCache>('CurrentUserCache');
  return new AuthMiddlewareService({
    tokenService,
    authUserService,
    currentUserCache: currentUserCacheValue,
    ctxStore,
  });
});

// ============================================
// Layer 4: Most Complex Services
// ============================================
container.singleton(AuthService, (c: Container) => {
  const db = c.resolve<IDb>('IDb');
  const env = c.resolve<IEnv>('IEnv');
  const passwordService = c.resolve<PasswordService>(PasswordService);
  const tokenService = c.resolve<TokenService>(TokenService);
  const otpService = c.resolve<OtpService>(OtpService);
  const sessionService = c.resolve<SessionService>(SessionService);
  const settingService = c.resolve<SettingsService>(SettingsService);
  const auditLogService = c.resolve<AuditLogsService>(AuditLogsService);
  const userUtilService = c.resolve<UserUtilService>(UserUtilService);
  const authUserService = c.resolve<AuthUserService>(AuthUserService);
  const securityMonitorService = c.resolve<SecurityMonitorService>(
    SecurityMonitorService,
  );
  return new AuthService({
    db,
    env,
    passwordService,
    tokenService,
    otpService,
    sessionService,
    settingService,
    auditLogService,
    userUtilService,
    authUserService,
    securityMonitorService,
  });
});

container.singleton(AuthFlowService, (c: Container) => {
  const db = c.resolve<IDb>('IDb');
  const env = c.resolve<IEnv>('IEnv');
  const passwordService = c.resolve<PasswordService>(PasswordService);
  const userUtilService = c.resolve<UserUtilService>(UserUtilService);
  const authUserService = c.resolve<AuthUserService>(AuthUserService);
  const authTxService = c.resolve<AuthTxService>(AuthTxService);
  const securityMonitorService = c.resolve<SecurityMonitorService>(
    SecurityMonitorService,
  );
  const settingService = c.resolve<SettingsService>(SettingsService);
  const auditLogService = c.resolve<AuditLogsService>(AuditLogsService);
  const captchaService = c.resolve<CaptchaService>(CaptchaService);
  const sessionService = c.resolve<SessionService>(SessionService);
  const otpService = c.resolve<OtpService>(OtpService);
  const mfaService = c.resolve<MfaService>(MfaService);
  const challengeResponseBuilder = c.resolve<ChallengeResponseBuilder>(
    ChallengeResponseBuilder,
  );
  const challengeResolver = c.resolve<ChallengeResolverService>(
    ChallengeResolverService,
  );
  const loginSteps = c.resolve<LoginStepsService>(LoginStepsService);
  return new AuthFlowService({
    db,
    env,
    passwordService,
    userUtilService,
    authUserService,
    authTxService,
    securityMonitorService,
    settingService: settingService,
    auditLogService,
    authenticator,
    captchaService,
    sessionService,
    otpService,
    mfaService,
    challengeResponseBuilder,
    challengeResolver,
    loginSteps,
  });
});

container.singleton(OAuthService, (c: Container) => {
  const db = c.resolve<IDb>('IDb');
  const userUtilService = c.resolve<UserUtilService>(UserUtilService);
  const auditLogsService = c.resolve<AuditLogsService>(AuditLogsService);
  const securityMonitorService = c.resolve<SecurityMonitorService>(
    SecurityMonitorService,
  );
  const idUtil = c.resolve<IdUtil>('IdUtil');
  const settingsService = c.resolve<SettingsService>(SettingsService);
  const challengeResponseBuilder = c.resolve<ChallengeResponseBuilder>(
    ChallengeResponseBuilder,
  );
  const challengeResolver = c.resolve<ChallengeResolverService>(
    ChallengeResolverService,
  );
  const authTxService = c.resolve<AuthTxService>(AuthTxService);
  const authFlowService = c.resolve<AuthFlowService>(AuthFlowService);
  return new OAuthService({
    db,
    oauth2ClientFactory: (clientId: string) => new OAuth2Client(clientId),
    userUtilService,
    auditLogsService,
    securityMonitorService,
    idUtil,
    crypto: { createHash, createHmac, randomBytes, randomUUID },
    authenticator,
    settingsService,
    challengeResponseBuilder,
    challengeResolver,
    authTxService,
    authFlowService,
  });
});

export { container };
