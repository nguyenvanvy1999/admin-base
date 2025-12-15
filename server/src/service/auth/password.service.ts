import dayjs from 'dayjs';
import { db } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import { BadReqErr, ErrCode } from 'src/share';
import { timeStringToSeconds } from 'src/share/utils/time.util';

export class BunPasswordHasher {
  hash(password: string): Promise<string> {
    return Bun.password.hash(password);
  }

  verify(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }
}

export class PasswordService {
  private env: IEnv;
  private db: typeof db;
  private passwordHasher: BunPasswordHasher;

  constructor(deps: {
    env: IEnv;
    db: typeof db;
    passwordHasher: BunPasswordHasher;
  }) {
    this.env = deps.env;
    this.db = deps.db;
    this.passwordHasher = deps.passwordHasher;
  }

  async createPassword(password: string): Promise<{
    password: string;
    passwordExpired: Date;
    passwordCreated: Date;
    passwordAttempt: 0;
  }> {
    const passwordWithPepper = password + this.env.PASSWORD_PEPPER;
    const passwordHash = await this.passwordHasher.hash(passwordWithPepper);
    const passwordExpired = dayjs()
      .add(timeStringToSeconds(this.env.PASSWORD_EXPIRED), 's')
      .toDate();
    const passwordCreated = new Date();
    return {
      password: passwordHash,
      passwordExpired,
      passwordCreated,
      passwordAttempt: 0,
    };
  }

  async increasePasswordAttempt(id: string): Promise<void> {
    await this.db.user.update({
      where: { id },
      data: { passwordAttempt: { increment: 1 } },
      select: { id: true },
    });
  }

  comparePassword(password: string, passwordHash: string): Promise<boolean> {
    const passwordWithPepper = password + this.env.PASSWORD_PEPPER;
    return this.passwordHasher.verify(passwordWithPepper, passwordHash);
  }
}

export const passwordService = new PasswordService({
  env,
  db,
  passwordHasher: new BunPasswordHasher(),
});

export interface PasswordValidationRules {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PasswordValidationService {
  constructor(private readonly e: IEnv = env) {}

  private getValidationRules(): PasswordValidationRules {
    return {
      minLength: this.e.PASSWORD_MIN_LENGTH,
      requireUppercase: this.e.PASSWORD_REQUIRE_UPPERCASE,
      requireLowercase: this.e.PASSWORD_REQUIRE_LOWERCASE,
      requireNumber: this.e.PASSWORD_REQUIRE_NUMBER,
      requireSpecialChar: this.e.PASSWORD_REQUIRE_SPECIAL_CHAR,
    };
  }

  validatePassword(password: string): PasswordValidationResult {
    const rules = this.getValidationRules();
    const errors: string[] = [];

    if (password.length < rules.minLength) {
      errors.push(
        `Password must be at least ${rules.minLength} characters long`,
      );
    }

    if (rules.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (rules.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (rules.requireNumber && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (
      rules.requireSpecialChar &&
      !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    ) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  validatePasswordOrThrow(password: string): void {
    const result = this.validatePassword(password);
    if (!result.isValid) {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: result.errors.join('; '),
      });
    }
  }
}

export const passwordValidationService = new PasswordValidationService();
