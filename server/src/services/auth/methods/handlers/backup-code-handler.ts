import type {
  AuthMethodContext,
  AuthMethodResult,
} from 'src/services/auth/types/auth-method-handler.interface';
import { AuthMethod, AuthMethodType } from 'src/services/auth/types/constants';
import { ErrCode } from 'src/share';
import { mfaService } from '../mfa.service';

export const backupCodeHandler = {
  verify: async (context: AuthMethodContext): Promise<AuthMethodResult> => {
    const { userId, code } = context;

    if (!code || code.length !== 8) {
      return {
        verified: false,
        errorCode: ErrCode.InvalidBackupCode,
      };
    }

    const verified = await mfaService.verifyBackupCode(code, userId);

    return {
      verified,
      errorCode: verified ? undefined : ErrCode.InvalidBackupCode,
    };
  },

  getAuthMethod: (): string => {
    return AuthMethod.BACKUP_CODE;
  },
};

export const backupCodeCapability = {
  method: AuthMethodType.BACKUP_CODE,
  label: 'Backup Code',
  description: 'Use one of your backup codes',
  requiresSetup: true,
  isAvailable: async (context: { user: { id: string } }) => {
    const { db } = await import('src/config/db');
    const backupCode = await db.mfaBackupCode.findUnique({
      where: { userId: context.user.id, usedAt: null },
    });
    return !!backupCode;
  },
};
