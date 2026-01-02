import { ChallengeType } from '../../types/constants';
import {
  AuthEvent,
  AuthState,
  type AuthStateContext,
  type AuthStateTransition,
} from './auth-states';

export { AuthEvent, AuthState } from './auth-states';

export class AuthStateMachine {
  private currentState: AuthState = AuthState.INITIAL;
  private challengeType: ChallengeType | null = null;

  private transitions: AuthStateTransition[] = [
    {
      from: AuthState.INITIAL,
      to: AuthState.PASSWORD_VERIFIED,
      event: AuthEvent.PASSWORD_VERIFIED,
    },
    {
      from: AuthState.PASSWORD_VERIFIED,
      to: AuthState.CHALLENGE,
      event: AuthEvent.CHALLENGE_REQUIRED,
      condition: (ctx) => this.shouldRequireChallenge(ctx),
    },
    {
      from: AuthState.PASSWORD_VERIFIED,
      to: AuthState.COMPLETED,
      event: AuthEvent.LOGIN_COMPLETED,
      condition: (ctx) => !this.shouldRequireChallenge(ctx),
    },
    {
      from: AuthState.CHALLENGE,
      to: AuthState.COMPLETED,
      event: AuthEvent.CHALLENGE_COMPLETED,
    },
  ];

  transition(event: AuthEvent, context?: AuthStateContext): AuthState {
    const validTransition = this.transitions.find(
      (t) =>
        t.from === this.currentState &&
        t.event === event &&
        (!t.condition || (context && t.condition(context))),
    );

    if (!validTransition) {
      throw new Error(
        `Invalid transition from ${this.currentState} with event ${event}`,
      );
    }

    this.currentState = validTransition.to;
    return this.currentState;
  }

  getCurrentState(): AuthState {
    return this.currentState;
  }

  getChallengeType(): ChallengeType | null {
    return this.challengeType;
  }

  setChallengeType(type: ChallengeType | null): void {
    this.challengeType = type;
  }

  resolveNextChallenge(context: AuthStateContext): ChallengeType | null {
    const mfaTotpEnabled =
      context.user?.mfaTotpEnabled ?? context.mfaTotpEnabled ?? false;
    const {
      mfaRequired,
      riskBased,
      risk,
      isNewDevice,
      deviceVerificationEnabled,
    } = context;

    if (!mfaTotpEnabled && isNewDevice && deviceVerificationEnabled) {
      return ChallengeType.DEVICE_VERIFY;
    }

    if (mfaRequired && !mfaTotpEnabled) return ChallengeType.MFA_REQUIRED;
    if (mfaTotpEnabled) return ChallengeType.MFA_REQUIRED;

    if (riskBased && (risk === 'MEDIUM' || risk === 'HIGH')) {
      return ChallengeType.MFA_REQUIRED;
    }

    return null;
  }

  private shouldRequireChallenge(context: AuthStateContext): boolean {
    return this.resolveNextChallenge(context) !== null;
  }
}
