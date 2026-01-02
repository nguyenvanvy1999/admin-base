import type {
  AuthChallengeRequestParams,
  IAuthResponse,
} from 'src/dtos/auth.dto';
import { BadReqErr, ErrCode, getIpAndUa } from 'src/share';
import type { IAuditLogService } from '../../domain/interfaces/audit-log.service.interface';
import type { IAuthUserService } from '../../domain/interfaces/auth-user.service.interface';
import type { ISessionService } from '../../domain/interfaces/session.service.interface';
import type { IAuthTxRepository } from '../../infrastructure/repositories/auth-tx.repository';
import { getMethodRegistry } from '../../methods/method-registry-init';
import type { AuthMethodContext } from '../../types/auth-method-handler.interface';
import {
  type AuthMethod,
  AuthStatus,
  AuthTxState,
} from '../../types/constants';
import {
  buildMfaFailedAuditLog,
  buildMfaVerifiedAuditLog,
} from '../../utils/auth-audit.helper';

export class CompleteChallengeUseCase {
  constructor(
    private readonly deps: {
      authTxRepository: IAuthTxRepository;
      authUserService: IAuthUserService;
      sessionService: ISessionService;
      auditLogService: IAuditLogService;
    },
  ) {}

  async execute(params: AuthChallengeRequestParams): Promise<IAuthResponse> {
    const { authTxId, method, code } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const tx = await this.deps.authTxRepository.getOrThrow(authTxId);
    this.deps.authTxRepository.assertBinding(tx, {
      ip: clientIp,
      ua: userAgent,
    });

    if (tx.state !== AuthTxState.CHALLENGE || !tx.challengeType) {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: 'Invalid auth transaction state',
      });
    }

    this.deps.authTxRepository.assertChallengeAttemptsAllowed(tx);

    const user = await this.deps.authUserService.loadUserForAuth(tx.userId);
    const registry = getMethodRegistry();
    const handler = registry.getHandler(method);

    const context: AuthMethodContext = {
      authTxId,
      authTx: tx as any,
      userId: user.id,
      code,
      clientIp,
      userAgent,
    };

    const result = await handler.verify(context);

    if (!result.verified) {
      await this.deps.authTxRepository.incrementChallengeAttempts(authTxId);
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

    await this.deps.authTxRepository.delete(authTxId);

    const session = await this.deps.sessionService.create(
      user as any,
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
}
