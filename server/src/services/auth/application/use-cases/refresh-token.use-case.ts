import dayjs from 'dayjs';
import type { ILoginRes, RefreshTokenParams } from 'src/dtos/auth.dto';
import { UserStatus } from 'src/generated';
import {
  ErrCode,
  getIpAndUa,
  type ITokenPayload,
  isExpired,
  UnAuthErr,
} from 'src/share';
import type { IAuditLogService } from '../../domain/interfaces/audit-log.service.interface';
import type { IAuthUserService } from '../../domain/interfaces/auth-user.service.interface';
import type { ISessionService } from '../../domain/interfaces/session.service.interface';
import type { ITokenService } from '../../domain/interfaces/token.service.interface';
import { AuthStatus } from '../../types/constants';
import {
  buildRefreshTokenFailedAuditLog,
  buildRefreshTokenSuccessAuditLog,
} from '../../utils/auth-audit.helper';

export class RefreshTokenUseCase {
  constructor(
    private readonly deps: {
      sessionService: ISessionService;
      tokenService: ITokenService;
      authUserService: IAuthUserService;
      auditLogService: IAuditLogService;
    },
  ) {}

  async execute(params: RefreshTokenParams): Promise<ILoginRes> {
    const { token } = params;
    const { clientIp, userAgent } = getIpAndUa();

    const session = await this.deps.sessionService.findByToken(token);

    if (
      !session ||
      session.revoked ||
      isExpired(session.expired) ||
      !session.createdBy ||
      session.createdBy.status !== UserStatus.active
    ) {
      await this.deps.auditLogService.pushSecurity(
        buildRefreshTokenFailedAuditLog(
          {
            id: session?.createdBy?.id ?? '',
            email: session?.createdBy?.email ?? null,
          },
          'refresh_token_invalid',
          {
            userId: session?.createdBy?.id,
            sessionId: session?.id,
          },
        ),
        {
          userId: session?.createdBy?.id ?? '',
          sessionId: session?.id ?? null,
          subjectUserId: session?.createdBy?.id ?? '',
        },
      );
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

    const userWithPermissions =
      await this.deps.authUserService.loadUserWithPermissions(
        session.createdBy.id,
        { checkStatus: false },
      );

    const user = {
      ...userWithPermissions,
      sessionId: session.id,
    };

    await this.deps.auditLogService.pushSecurity(
      buildRefreshTokenSuccessAuditLog(
        {
          id: session.createdBy.id,
          email: session.createdBy.email,
        },
        {
          userId: session.createdBy.id,
          sessionId: session.id,
        },
      ),
      {
        userId: session.createdBy.id,
        sessionId: session.id ?? null,
        subjectUserId: session.createdBy.id,
      },
    );

    return {
      type: AuthStatus.COMPLETED,
      accessToken,
      refreshToken: token,
      exp: expirationTime.getTime(),
      expired: dayjs(expirationTime).format(),
      user,
      sessionId: session.id,
    };
  }
}
