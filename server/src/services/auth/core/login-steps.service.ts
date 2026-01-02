import { BadReqErr, ErrCode, type LoginMethod } from 'src/share';
import type { PasswordService } from '../methods/password.service';
import type { CaptchaService } from '../security/captcha.service';
import type {
  SecurityCheckResult,
  SecurityMonitorService,
} from '../security/security-monitor.service';

export interface CaptchaParams {
  token: string;
  userInput: string;
}

type UserForPassword = {
  id: string;
  password: string;
  passwordAttempt: number;
};
type UserForSecurity = { id: string };

export class LoginStepsService {
  constructor(
    private readonly deps: {
      passwordService: PasswordService;
      captchaService: CaptchaService;
      securityMonitorService: SecurityMonitorService;
    },
  ) {}

  async validateCaptcha(captcha?: CaptchaParams): Promise<void> {
    if (!captcha) {
      return;
    }

    const captchaValid = await this.deps.captchaService.validateCaptcha({
      token: captcha.token,
      userInput: captcha.userInput,
    });

    if (!captchaValid) {
      throw new BadReqErr(ErrCode.InvalidCaptcha);
    }
  }

  validatePassword(
    password: string,
    user: UserForPassword,
    maxAttempt?: number,
  ): Promise<boolean> {
    if (maxAttempt) {
      this.deps.passwordService.validateAttempt(user, maxAttempt);
    }

    return this.deps.passwordService.verifyAndTrack(password, user);
  }

  evaluateSecurity(
    user: UserForSecurity,
    method: LoginMethod,
  ): Promise<SecurityCheckResult> {
    return this.deps.securityMonitorService.evaluateLogin({
      userId: user.id,
      method,
    });
  }
}
