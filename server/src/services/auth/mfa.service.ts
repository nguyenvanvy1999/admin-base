import crypto from 'node:crypto';

export const BACKUP_CODES_COUNT = 10;
export const BACKUP_CODE_LENGTH = 8;

export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export function parseBackupCodes(data: string | null): string[] {
  return data ? (JSON.parse(data) as string[]) : [];
}

export function parseUsedBackupCodes(data: string | null): string[] {
  return data ? (JSON.parse(data) as string[]) : [];
}

export function generateBackupCodes(
  count = BACKUP_CODES_COUNT,
  length = BACKUP_CODE_LENGTH,
): string[] {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < length; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    codes.push(code);
  }

  return codes;
}

import { PurposeVerify } from 'src/share';
import { otpService } from './otp.service';

export function verifyEmailOtp(
  otpToken: string,
  code: string,
): Promise<string | null> {
  // Returns userId if verified, null otherwise
  return otpService.verifyOtp(otpToken, PurposeVerify.MFA_LOGIN, code);
}
