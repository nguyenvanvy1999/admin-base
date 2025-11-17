import { type IDb, prisma } from '@server/configs/db';
import { appEnv, type IEnv } from '@server/configs/env';
import { TimeUtil } from '@server/share';
import dayjs from 'dayjs';

export class BunPasswordHasher {
  async hash(password: string): Promise<string> {
    return await Bun.password.hash(password, 'bcrypt');
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return await Bun.password.verify(password, hash, 'bcrypt');
  }
}

export class PasswordService {
  constructor(
    private readonly deps: {
      env: IEnv;
      db: IDb;
      passwordHasher: BunPasswordHasher;
      timeUtil: TimeUtil;
    } = {
      env: appEnv,
      db: prisma,
      passwordHasher: new BunPasswordHasher(),
      timeUtil: new TimeUtil(),
    },
  ) {}

  async createPassword(
    password: string,
    expiredAfter?: string,
  ): Promise<{
    password: string;
    passwordExpired: Date;
    passwordCreated: Date;
    passwordAttempt: 0;
  }> {
    const passwordWithPepper = password + this.deps.env.PASSWORD_PEPPER;
    const passwordHash =
      await this.deps.passwordHasher.hash(passwordWithPepper);
    const passwordExpired = dayjs()
      .add(
        this.deps.timeUtil.parseTime(
          expiredAfter ?? this.deps.env.PASSWORD_EXPIRED,
        ),
        's',
      )
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
    await this.deps.db.user.update({
      where: { id },
      data: { passwordAttempt: { increment: 1 } },
      select: { id: true },
    });
  }

  async comparePassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    const passwordWithPepper = password + this.deps.env.PASSWORD_PEPPER;
    return await this.deps.passwordHasher.verify(
      passwordWithPepper,
      passwordHash,
    );
  }
}

export const passwordService = new PasswordService();
