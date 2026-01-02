export enum AuthState {
  INITIAL = 'INITIAL',
  PASSWORD_VERIFIED = 'PASSWORD_VERIFIED',
  CHALLENGE = 'CHALLENGE',
  COMPLETED = 'COMPLETED',
}

export enum AuthEvent {
  PASSWORD_VERIFIED = 'PASSWORD_VERIFIED',
  CHALLENGE_REQUIRED = 'CHALLENGE_REQUIRED',
  CHALLENGE_COMPLETED = 'CHALLENGE_COMPLETED',
  LOGIN_COMPLETED = 'LOGIN_COMPLETED',
}

export interface AuthStateContext {
  user?: { mfaTotpEnabled: boolean };
  mfaTotpEnabled?: boolean;
  mfaRequired: boolean;
  riskBased?: boolean;
  risk?: 'LOW' | 'MEDIUM' | 'HIGH';
  isNewDevice?: boolean;
  deviceVerificationEnabled?: boolean;
}

export interface AuthStateTransition {
  from: AuthState;
  to: AuthState;
  event: AuthEvent;
  condition?: (context: AuthStateContext) => boolean;
}
