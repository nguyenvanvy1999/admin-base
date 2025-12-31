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

export interface IBackupCodesRemaining {
  remaining: number;
  total: number;
}
