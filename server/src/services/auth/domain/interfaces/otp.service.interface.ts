import type { PurposeVerify } from 'src/share';

export interface IOtpService {
  generateOtp(
    id: string,
    purpose: PurposeVerify,
    userId: string,
  ): Promise<string>;
  verifyOtp(
    id: string,
    purpose: PurposeVerify,
    otp: string,
  ): Promise<string | null>;
  sendOtp(
    userId: string,
    email: string,
    purpose: PurposeVerify,
  ): Promise<string | null>;
  sendOtpWithAudit(
    email: string,
    purpose: PurposeVerify,
  ): Promise<{ otpToken: string } | null>;
  checkOtpConditions(
    user: {
      id: string;
      status: string;
      password: string | null;
      mfaTotpEnabled: boolean;
    },
    purpose: PurposeVerify,
  ): Promise<boolean>;
}
