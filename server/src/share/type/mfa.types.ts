export interface IBackupCode {
  code: string;
  used: boolean;
  usedAt?: Date;
}

export interface IMfaUser {
  id: string;
  mfaTotpEnabled: boolean;
  totpSecret: string | null;
  backupCodes: string | null;
  backupCodesUsed: string | null;
}

export interface IBackupCodesData {
  codes: string[];
  hashedCodes: string[];
}

export interface IMfaStatus {
  enabled: boolean;
  hasBackupCodes: boolean;
  backupCodesRemaining: number;
}

export interface IGenerateBackupCodesParams {
  userId: string;
  sessionId: string;
  otp: string;
  clientIp?: string;
  userAgent?: string;
}

export interface IVerifyBackupCodeParams {
  mfaToken: string;
  backupCode: string;
  clientIp?: string;
  userAgent?: string;
}

export interface IDisableMfaParams {
  userId: string;
  sessionId: string;
  otp?: string;
  backupCode?: string;
  clientIp?: string;
  userAgent?: string;
}

export interface IBackupCodesRemaining {
  remaining: number;
  total: number;
}
