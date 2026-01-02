import { randomUUID } from 'node:crypto';
import type { authenticator } from 'otplib';
import type { IDb } from 'src/config/db';
import type {
  AuthEnrollConfirmRequestParams,
  AuthEnrollStartRequestParams,
  AuthEnrollStartResponseDto,
} from 'src/dtos/auth.dto';
import { UserStatus } from 'src/generated';
import { BadReqErr, ErrCode, getIpAndUa, userResSelect } from 'src/share';
import type { IAuditLogService } from '../../domain/interfaces/audit-log.service.interface';
import type { IMfaService } from '../../domain/interfaces/mfa.service.interface';
import type { IAuthTxRepository } from '../../infrastructure/repositories/auth-tx.repository';
import { AuthMethod, AuthTxState, ChallengeType } from '../../types/constants';
import {
  buildMfaSetupCompletedAuditLog,
  buildMfaSetupStartedAuditLog,
} from '../../utils/auth-audit.helper';
import { assertUserExists } from '../../utils/auth-errors.util';

export class MfaEnrollStartUseCase {
  constructor(
    private readonly deps: {
      db: IDb;
      authTxRepository: IAuthTxRepository;
      auditLogService: IAuditLogService;
      authenticator: typeof authenticator;
    },
  ) {}

  async execute(params: AuthEnrollStartRequestParams) {
    const { authTxId } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const tx = await this.deps.authTxRepository.getOrThrow(authTxId);
    this.deps.authTxRepository.assertBinding(tx, {
      ip: clientIp,
      ua: userAgent,
    });

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

    const tempSecret = this.deps.authenticator.generateSecret().toUpperCase();
    const otpauthUrl = this.deps.authenticator.keyuri(
      user.email ?? user.id,
      'Admin Base Portal',
      tempSecret,
    );

    const enrollToken = randomUUID();

    await this.deps.authTxRepository.attachEnroll(authTxId, {
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

  async executeForAuthenticatedUser(
    userId: string,
  ): Promise<typeof AuthEnrollStartResponseDto.static> {
    const { clientIp, userAgent } = getIpAndUa();

    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaTotpEnabled: true },
    });
    assertUserExists(user);
    if (user.mfaTotpEnabled) throw new BadReqErr(ErrCode.MFAHasBeenSetup);

    const authTx = await this.deps.authTxRepository.create(
      userId,
      AuthTxState.CHALLENGE,
      { ip: clientIp, ua: userAgent },
      undefined,
      ChallengeType.MFA_ENROLL,
    );

    return await this.execute({ authTxId: authTx.id });
  }
}

export class MfaEnrollConfirmUseCase {
  constructor(
    private readonly deps: {
      db: IDb;
      authTxRepository: IAuthTxRepository;
      mfaService: IMfaService;
      auditLogService: IAuditLogService;
      authenticator: typeof authenticator;
    },
  ) {}

  async execute(
    params: AuthEnrollConfirmRequestParams,
  ): Promise<{ backupCodes: string[] }> {
    const { authTxId, enrollToken, otp } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const tx = await this.deps.authTxRepository.getOrThrow(authTxId);
    this.deps.authTxRepository.assertBinding(tx, {
      ip: clientIp,
      ua: userAgent,
    });

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

    this.deps.authTxRepository.assertChallengeAttemptsAllowed(tx);

    const otpOk = this.deps.authenticator.verify({
      secret: tx.enroll.tempTotpSecret,
      token: otp,
    });

    if (!otpOk) {
      await this.deps.authTxRepository.incrementChallengeAttempts(authTxId);
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

    await this.deps.authTxRepository.delete(authTxId);

    await this.deps.auditLogService.pushSecurity(
      buildMfaSetupCompletedAuditLog(userResult, AuthMethod.TOTP, {
        userId: userResult.id,
      }),
      { userId: userResult.id, subjectUserId: userResult.id },
    );

    return { backupCodes: [code] };
  }
}
