export interface IMfaService {
  hashBackupCode(code: string): Promise<string>;
  verifyBackupCode(code: string, userId: string): Promise<boolean>;
  generateBackupCode(): string;
  saveBackupCode(userId: string, codeHash: string): Promise<void>;
  verifyEmailOtp(otpToken: string, code: string): Promise<string | null>;
}
