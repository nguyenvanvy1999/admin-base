import { BadReqErr, ErrCode, getIpAndUa } from 'src/share';
import type { ChallengeResolverService } from '../../core/challenge-resolver.service';
import type { IAuthUserService } from '../../domain/interfaces/auth-user.service.interface';
import type { IAuthTxRepository } from '../../infrastructure/repositories/auth-tx.repository';
import { AuthTxState } from '../../types/constants';

export class GetChallengeMethodsUseCase {
  constructor(
    private readonly deps: {
      authTxRepository: IAuthTxRepository;
      authUserService: IAuthUserService;
      challengeResolver: ChallengeResolverService;
    },
  ) {}

  async execute(authTxId: string) {
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

    const user = await this.deps.authUserService.loadUserForAuth(tx.userId);

    return this.deps.challengeResolver.resolveAvailableMethods({
      user: { ...user, email: user.email || '', status: user.status as any },
      authTx: tx as any,
      securityResult: tx.securityResult,
      challengeType: tx.challengeType!,
    });
  }
}
