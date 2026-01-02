export interface IPasswordService {
  createPassword(password: string): Promise<{
    password: string;
    passwordExpired: Date;
    passwordCreated: Date;
    passwordAttempt: number;
  }>;
  comparePassword(password: string, passwordHash: string): Promise<boolean>;
  verifyAndTrack(
    password: string,
    user: { id: string; password: string },
  ): Promise<boolean>;
  validateAttempt(user: { passwordAttempt: number }, maxAttempts: number): void;
  validateExpiration(user: { passwordExpired: Date | null }): void;
  increasePasswordAttempt(id: string): Promise<void>;
}
