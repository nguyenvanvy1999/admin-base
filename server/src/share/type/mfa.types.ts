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
  otp: string;
}

export interface IDisableMfaParams {
  userId: string;
  otp?: string;
  backupCode?: string;
}

export interface IBackupCodesRemaining {
  remaining: number;
  total: number;
}
