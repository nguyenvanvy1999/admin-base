import { db, type IDb } from 'src/config/db';
import { type IdUtil, idUtil, PurposeVerify } from 'src/share';
import { type OtpService, otpService } from './otp.service';

export const BACKUP_CODE_LENGTH = 8;

export class MfaService {
  constructor(
    private readonly deps: {
      db: IDb;
      otpService: OtpService;
      idUtil: IdUtil;
    } = {
      db,
      otpService,
      idUtil,
    },
  ) {}

  hashBackupCode(code: string): Promise<string> {
    return Bun.password.hash(code);
  }

  async verifyBackupCode(code: string, userId: string): Promise<boolean> {
    const backupCode = await this.deps.db.mfaBackupCode.findUnique({
      where: { userId, usedAt: null },
    });

    if (!backupCode) return false;

    try {
      const isMatch = await Bun.password.verify(code, backupCode.codeHash);
      if (isMatch) {
        // Mark as used
        await this.deps.db.mfaBackupCode.update({
          where: { id: backupCode.id },
          data: { usedAt: new Date() },
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  generateBackupCode(): string {
    // Generate a random 8-character code and ensure it's uppercase
    return this.deps.idUtil.token8().toUpperCase();
  }

  async saveBackupCode(userId: string, codeHash: string): Promise<void> {
    await this.deps.db.mfaBackupCode.upsert({
      where: { userId },
      create: { userId, codeHash, usedAt: null },
      update: { codeHash, usedAt: null, created: new Date() },
    });
  }

  verifyEmailOtp(otpToken: string, code: string): Promise<string | null> {
    // Returns userId if verified, null otherwise
    return this.deps.otpService.verifyOtp(
      otpToken,
      PurposeVerify.MFA_LOGIN,
      code,
    );
  }
}

export const mfaService = new MfaService();
