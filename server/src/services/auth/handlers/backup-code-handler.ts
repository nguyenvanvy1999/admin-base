import { ErrCode } from 'src/share';
import type {
  AuthMethodContext,
  AuthMethodResult,
  IAuthMethodHandler,
} from '../auth-method-handler.interface';
import { AuthChallengeType, AuthMethod } from '../constants';
import type { MfaService } from '../mfa.service';

export class BackupCodeHandler implements IAuthMethodHandler {
  readonly type = AuthChallengeType.MFA_BACKUP_CODE;

  constructor(
    private readonly deps: {
      mfaService: MfaService;
    },
  ) {}

  async verify(context: AuthMethodContext): Promise<AuthMethodResult> {
    const { userId, code } = context;

    if (!code || code.length !== 8) {
      return {
        verified: false,
        errorCode: ErrCode.InvalidBackupCode,
      };
    }

    const verified = await this.deps.mfaService.verifyBackupCode(code, userId);

    return {
      verified,
      errorCode: verified ? undefined : ErrCode.InvalidBackupCode,
    };
  }

  getAuthMethod(): string {
    return AuthMethod.BACKUP_CODE;
  }
}
