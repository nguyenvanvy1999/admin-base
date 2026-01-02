import { db, type IDb } from 'src/config/db';
import type {
  AuthMethodOption,
  ChallengeDto,
  ChallengeMetadata,
} from 'src/dtos/auth.dto';
import type { User } from 'src/generated';
import type { SecurityCheckResult } from 'src/services/auth/security/security-monitor.service';
import { AuthChallengeType } from 'src/services/auth/types/constants';
import type { AuthTx } from 'src/types/auth.types';
import type { MfaService } from '../methods/mfa.service';
import { mfaService } from '../methods/mfa.service';

export interface ChallengeContext {
  user: Pick<User, 'id' | 'email' | 'mfaTotpEnabled'>;
  authTx: AuthTx;
  securityResult?: SecurityCheckResult;
  availableMethods: AuthMethodOption[];
}

export class ChallengeResponseBuilder {
  constructor(
    private readonly deps: {
      db: IDb;
      mfaService: MfaService;
    } = {
      db,
      mfaService,
    },
  ) {}

  async buildMfaRequired(context: ChallengeContext): Promise<ChallengeDto> {
    const { user, availableMethods } = context;

    const hasBackup = await this.hasBackupCode(user.id);

    const metadata: ChallengeMetadata = {
      totp: {
        allowBackupCode: hasBackup,
      },
    };

    return {
      type: AuthChallengeType.MFA_REQUIRED,
      availableMethods,
      metadata,
    };
  }

  buildDeviceVerify(context: ChallengeContext): ChallengeDto {
    const { user, availableMethods, securityResult } = context;

    const maskedEmail = this.maskEmail(user.email || '');

    const metadata: ChallengeMetadata = {
      device: {
        isNewDevice: securityResult?.isNewDevice ?? false,
        deviceFingerprint: securityResult?.deviceFingerprint || undefined,
      },
      email: {
        destination: maskedEmail,
        sentAt: Date.now(),
      },
    };

    return {
      type: AuthChallengeType.DEVICE_VERIFY,
      availableMethods,
      metadata,
    };
  }

  private maskEmail(email: string): string {
    return email.replace(
      /^(.{2})(.*)(@.*)$/,
      (_, a, b, c) => `${a}${'*'.repeat(b.length)}${c}`,
    );
  }

  private async hasBackupCode(userId: string): Promise<boolean> {
    const backupCode = await this.deps.db.mfaBackupCode.findUnique({
      where: { userId, usedAt: null },
    });
    return !!backupCode;
  }
}
