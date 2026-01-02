import dayjs from 'dayjs';
import { db } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import type { SettingsService } from 'src/services/settings/settings.service';
import { settingsService } from 'src/services/settings/settings.service';
import { BadReqErr, ErrCode, SETTING, timeStringToSeconds } from 'src/share';

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
  private settingsService: SettingsService;

  constructor(deps: {
    env: IEnv;
    db: typeof db;
    passwordHasher: BunPasswordHasher;
    settingsService: SettingsService;
  }) {
    this.env = deps.env;
    this.db = deps.db;
    this.passwordHasher = deps.passwordHasher;
    this.settingsService = deps.settingsService;
  }

  async createPassword(password: string): Promise<{
    password: string;
    passwordExpired: Date;
    passwordCreated: Date;
    passwordAttempt: 0;
  }> {
    const passwordWithPepper = password + this.env.PASSWORD_PEPPER;
    const passwordHash = await this.passwordHasher.hash(passwordWithPepper);
    const passwordExpiredSetting =
      await this.settingsService.getSetting<string>(SETTING.PASSWORD_EXPIRED);
    const passwordExpired = dayjs()
      .add(timeStringToSeconds(passwordExpiredSetting), 's')
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

  validateAttempt(
    user: { passwordAttempt: number },
    maxAttempts: number,
  ): void {
    if (user.passwordAttempt >= maxAttempts) {
      throw new BadReqErr(ErrCode.PasswordMaxAttempt);
    }
  }

  validateExpiration(user: { passwordExpired: Date | null }): void {
    if (user.passwordExpired && new Date() > new Date(user.passwordExpired)) {
      throw new BadReqErr(ErrCode.PasswordExpired);
    }
  }

  async verifyAndTrack(
    password: string,
    user: { id: string; password: string },
  ): Promise<boolean> {
    const match = await this.comparePassword(password, user.password);

    if (!match) {
      await this.increasePasswordAttempt(user.id);
      return false;
    }

    return true;
  }
}

export const passwordService = new PasswordService({
  env,
  db,
  passwordHasher: new BunPasswordHasher(),
  settingsService,
});
