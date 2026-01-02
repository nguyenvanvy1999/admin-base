import { UserStatus } from 'src/generated';

export class UserAuth {
  constructor(
    public readonly id: string,
    public readonly email: string | null,
    public readonly status: UserStatus,
    public readonly password: string | null,
    public readonly passwordAttempt: number,
    public readonly passwordExpired: Date | null,
    public readonly mfaTotpEnabled: boolean,
    public readonly totpSecret: string | null,
    public readonly roles: { roleId: string }[],
    public readonly mfaEnrollRequired: boolean,
  ) {}

  isActive(): boolean {
    return this.status === UserStatus.active;
  }

  hasPassword(): boolean {
    return this.password !== null;
  }

  hasMfaEnabled(): boolean {
    return this.mfaTotpEnabled;
  }

  canLogin(): boolean {
    return this.isActive() && this.hasPassword();
  }
}
