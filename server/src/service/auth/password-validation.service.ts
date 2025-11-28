import { env, type IEnv } from 'src/config/env';
import { BadReqErr, ErrCode } from 'src/share';

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
