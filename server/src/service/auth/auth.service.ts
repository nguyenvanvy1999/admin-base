import dayjs from 'dayjs';
import { db, type IDb } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import { UserStatus } from 'src/generated';
import type {
  ChangePasswordRequestDto,
  ForgotPasswordRequestDto,
  ILoginRes,
  ILoginResponse,
  LoginMFAResDto,
  LoginRequestDto,
  RefreshTokenRequestDto,
  RegisterRequestDto,
  VerifyAccountRequestDto,
} from 'src/modules/auth/dtos';
import {
  type AuditLogService,
  auditLogService,
} from 'src/service/misc/audit-log.service';
import {
  type ReferralService,
  referralService,
} from 'src/service/misc/referral.service';
import {
  type SettingService,
  settingService,
} from 'src/service/misc/setting.service';
import {
  ACTIVITY_TYPE,
  BadReqErr,
  DB_PREFIX,
  defaultRoles,
  ErrCode,
  IdUtil,
  type ITokenPayload,
  isExpired,
  LoginResType,
  NotFoundErr,
  PurposeVerify,
  UnAuthErr,
  userResSelect,
} from 'src/share';
import {
  type TokenService,
  tokenService,
  type UserUtilService,
  userUtilService,
} from './auth-util.service';
import { type MfaUtilService, mfaUtilService } from './mfa-util.service';
import { type OtpService, otpService } from './otp.service';
import { type PasswordService, passwordService } from './password.service';
import { type SessionService, sessionService } from './session.service';

type LoginParams = typeof LoginRequestDto.static & {
  clientIp: string;
  userAgent: string;
};

type RegisterParams = typeof RegisterRequestDto.static;

type ChangePasswordParams = {
  userId: string;
} & typeof ChangePasswordRequestDto.static;

type ForgotPasswordParams = typeof ForgotPasswordRequestDto.static;

type VerifyAccountParams = typeof VerifyAccountRequestDto.static & {
  clientIp: string;
  userAgent: string;
};

type RefreshTokenParams = typeof RefreshTokenRequestDto.static & {
  clientIp: string;
  userAgent: string;
};

type LogoutParams = {
  userId: string;
  sessionId: string;
  clientIp: string;
  userAgent: string;
};

export class AuthService {
  constructor(
    private readonly deps: {
      db: IDb;
      env: IEnv;
      passwordService: PasswordService;
      tokenService: TokenService;
      mfaUtilService: MfaUtilService;
      otpService: OtpService;
      sessionService: SessionService;
      settingService: SettingService;
      auditLogService: AuditLogService;
      referralService: ReferralService;
      userUtilService: UserUtilService;
    } = {
      db,
      env,
      passwordService,
      tokenService,
      mfaUtilService,
      otpService,
      sessionService,
      settingService,
      auditLogService,
      referralService,
      userUtilService,
    },
  ) {}

  async login(params: LoginParams): Promise<ILoginResponse> {
    const { email, password, clientIp, userAgent } = params;

    const user = await this.findUserByEmail(email);
    this.validateUserForLogin(user);

    const { enbAttempt, enbExpired } =
      await this.deps.settingService.password();
    this.validatePasswordAttempts(user, enbAttempt);

    await this.validatePassword(password, user);

    if (user.status !== UserStatus.active) {
      throw new BadReqErr(ErrCode.UserNotActive);
    }

    this.validatePasswordExpiration(user, enbExpired);

    if (user.mfaTotpEnabled) {
      return this.handleMfaLogin(user);
    }

    const loginRes = await this.deps.userUtilService.completeLogin(
      user,
      clientIp,
      userAgent,
    );
    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.LOGIN,
      payload: { method: 'email' },
      userId: user.id,
      ip: clientIp,
      userAgent,
    });
    return loginRes;
  }

  private async findUserByEmail(email: string) {
    const user = await this.deps.db.user.findUnique({
      where: { email },
      include: { roles: true },
    });
    if (!user) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }
    if (!user.password) {
      throw new NotFoundErr(ErrCode.PasswordNotSet);
    }
    return user;
  }

  private validateUserForLogin(user: { password: string | null }): void {
    if (!user.password) {
      throw new NotFoundErr(ErrCode.PasswordNotSet);
    }
  }

  private validatePasswordAttempts(
    user: { passwordAttempt: number },
    enbAttempt: boolean,
  ): void {
    if (
      enbAttempt &&
      user.passwordAttempt >= this.deps.env.PASSWORD_MAX_ATTEMPT
    ) {
      throw new BadReqErr(ErrCode.PasswordMaxAttempt);
    }
  }

  private async validatePassword(
    password: string,
    user: { id: string; password: string | null },
  ): Promise<void> {
    if (!user.password) {
      throw new NotFoundErr(ErrCode.PasswordNotSet);
    }
    const match = await this.deps.passwordService.comparePassword(
      password,
      user.password,
    );
    if (!match) {
      await this.deps.passwordService.increasePasswordAttempt(user.id);
      throw new BadReqErr(ErrCode.PasswordNotMatch);
    }
  }

  private validatePasswordExpiration(
    user: { passwordExpired: Date | null },
    enbExpired: boolean,
  ): void {
    if (
      user.passwordExpired &&
      enbExpired &&
      new Date() > new Date(user.passwordExpired)
    ) {
      throw new BadReqErr(ErrCode.PasswordExpired);
    }
  }

  private async handleMfaLogin(user: {
    id: string;
    mfaTotpEnabled: boolean;
    totpSecret: string | null;
  }) {
    const loginToken = IdUtil.token16();
    const mfaToken = await this.deps.mfaUtilService.createSession({
      loginToken,
      user: {
        id: user.id,
        mfaTotpEnabled: user.mfaTotpEnabled,
        totpSecret: user.totpSecret,
      },
    });
    return {
      type: LoginResType.MFA_CONFIRM,
      loginToken,
      mfaToken,
    } as typeof LoginMFAResDto.static;
  }

  async register(params: RegisterParams): Promise<{ otpToken: string } | null> {
    const { email, password } = params;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await this.deps.db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, status: true },
    });

    if (existingUser) {
      throw new BadReqErr(ErrCode.UserExisted);
    }

    const createdUserId = await this.deps.db.$transaction(async (tx) => {
      const userId = IdUtil.dbId(DB_PREFIX.USER);
      // Get default currency (first active currency or first currency)
      const defaultCurrency =
        (await tx.currency.findFirst({
          where: { isActive: true },
          orderBy: { code: 'asc' },
          select: { id: true },
        })) ||
        (await tx.currency.findFirst({
          orderBy: { code: 'asc' },
          select: { id: true },
        }));

      if (!defaultCurrency) {
        throw new BadReqErr(ErrCode.InternalError);
      }

      await tx.user.create({
        data: {
          id: userId,
          email: normalizedEmail,
          status: UserStatus.inactive,
          baseCurrencyId: defaultCurrency.id,
          ...(await this.deps.passwordService.createPassword(password)),
          roles: {
            create: {
              id: IdUtil.dbId(),
              roleId: defaultRoles.user.id,
            },
          },
          refCode: IdUtil.token8().toUpperCase(),
        },
        select: { id: true },
      });

      await this.deps.userUtilService.createProfile(tx, userId);

      return userId;
    });

    const otpToken = await this.deps.otpService.sendOtp(
      createdUserId,
      normalizedEmail,
      PurposeVerify.REGISTER,
    );

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.REGISTER,
      payload: { method: 'email' },
      userId: createdUserId,
    });

    if (otpToken) {
      return { otpToken };
    }
    return null;
  }

  async changePassword(params: ChangePasswordParams): Promise<void> {
    const { userId, oldPassword, newPassword } = params;

    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { password: true, status: true, email: true },
    });
    if (!user) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    if (user.status !== UserStatus.active) {
      throw new BadReqErr(ErrCode.UserNotActive);
    }

    if (user.password) {
      if (!oldPassword) {
        throw new BadReqErr(ErrCode.PasswordNotMatch);
      }
      const match = await this.deps.passwordService.comparePassword(
        oldPassword,
        user.password,
      );
      if (!match) {
        throw new BadReqErr(ErrCode.PasswordNotMatch);
      }
    }

    await this.deps.db.user.update({
      where: { id: userId },
      data: {
        ...(await this.deps.passwordService.createPassword(newPassword)),
        lastPasswordChangeAt: new Date(),
      },
      select: { id: true },
    });

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.CHANGE_PASSWORD,
      payload: {},
      userId,
    });
  }

  async forgotPassword(params: ForgotPasswordParams): Promise<void> {
    const { otpToken, otp, newPassword } = params;

    const userId = await this.deps.otpService.verifyOtp(
      otpToken,
      PurposeVerify.REGISTER,
      otp,
    );

    if (!userId) {
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });
    if (!user) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    await this.deps.db.user.update({
      where: { id: user.id },
      data: {
        ...(await this.deps.passwordService.createPassword(newPassword)),
        lastPasswordChangeAt: new Date(),
      },
    });

    await this.deps.sessionService.revoke(userId);

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.CHANGE_PASSWORD,
      payload: {},
      userId,
    });
  }

  async verifyAccount(params: VerifyAccountParams): Promise<void> {
    const { otpToken, otp, clientIp, userAgent } = params;

    const userId = await this.deps.otpService.verifyOtp(
      otpToken,
      PurposeVerify.REGISTER,
      otp,
    );

    if (!userId) {
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    await this.deps.db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId, status: UserStatus.inactive },
        data: { status: UserStatus.active },
        select: { id: true },
      });
      if (user.id) {
        await this.deps.referralService.activeReferral(tx, user.id);
      }
    });

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.UPDATE_USER,
      payload: { id: userId, enabled: true },
      userId,
      ip: clientIp,
      userAgent,
    });
  }

  async refreshToken(params: RefreshTokenParams): Promise<ILoginRes> {
    const { token, clientIp, userAgent } = params;

    const session = await this.deps.db.session.findFirst({
      where: { token },
      select: {
        revoked: true,
        id: true,
        expired: true,
        createdBy: { select: userResSelect },
      },
    });

    if (
      !session ||
      session.revoked ||
      isExpired(session.expired) ||
      !session.createdBy ||
      session.createdBy.status !== 'active'
    ) {
      throw new UnAuthErr(ErrCode.ExpiredToken);
    }

    const payload: ITokenPayload = {
      userId: session.createdBy.id,
      timestamp: Date.now(),
      sessionId: session.id,
      clientIp,
      userAgent,
    };

    const { accessToken, expirationTime } =
      await this.deps.tokenService.createAccessToken(payload);

    const user = {
      ...session.createdBy,
      permissions: await this.deps.userUtilService.getPermissions(
        session.createdBy,
      ),
    };

    return {
      type: LoginResType.COMPLETED,
      accessToken,
      refreshToken: token,
      exp: expirationTime.getTime(),
      expired: dayjs(expirationTime).format(),
      user,
    };
  }

  async logout(params: LogoutParams): Promise<void> {
    const { userId, sessionId, clientIp, userAgent } = params;

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.LOGOUT,
      payload: {},
      userId,
      sessionId,
      ip: clientIp,
      userAgent,
    });

    await this.deps.sessionService.revoke(userId, [sessionId]);
  }

  async logoutAll(params: LogoutParams): Promise<void> {
    const { userId, sessionId, clientIp, userAgent } = params;

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.REVOKE_SESSION,
      payload: { sessionId },
      userId,
      sessionId,
      ip: clientIp,
      userAgent,
    });

    await this.deps.sessionService.revoke(userId);
  }

  async getProfile(userId: string) {
    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: userResSelect,
    });

    if (!user) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    const permissions = await this.deps.userUtilService.getPermissions(user);

    return {
      ...user,
      permissions,
    };
  }
}

export const authService = new AuthService();
