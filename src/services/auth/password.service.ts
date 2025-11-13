import { prisma } from '@server/configs/db';
import { appEnv, type IEnv } from '@server/configs/env';

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
      db: typeof prisma;
      passwordHasher: BunPasswordHasher;
    } = {
      env: appEnv,
      db: prisma,
      passwordHasher: new BunPasswordHasher(),
    },
  ) {}

  async createPassword(password: string): Promise<{
    password: string;
  }> {
    const passwordHash = await this.deps.passwordHasher.hash(password);
    return {
      password: passwordHash,
    };
  }

  async increasePasswordAttempt(id: string): Promise<void> {
    await this.deps.db.user.update({
      where: { id },
      data: {},
      select: { id: true },
    });
  }

  async comparePassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    return await this.deps.passwordHasher.verify(password, passwordHash);
  }
}

export const passwordService = new PasswordService();
