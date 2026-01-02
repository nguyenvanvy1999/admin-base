import type { IDb } from 'src/config/db';
import { UserStatus } from 'src/generated';
import { BadReqErr, ErrCode, normalizeEmail } from 'src/share';
import type { IAuthenticationService } from '../interfaces/authentication.service.interface';
import type { IPasswordService } from '../interfaces/password.service.interface';

export class AuthenticationService implements IAuthenticationService {
  constructor(
    private readonly deps: {
      db: IDb;
      passwordService: IPasswordService;
    },
  ) {}

  async verifyCredentials(
    email: string,
    password: string,
  ): Promise<{ userId: string; isValid: boolean }> {
    const normalizedEmail = normalizeEmail(email);

    const user = await this.deps.db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, password: true, status: true },
    });

    if (!user || !user.password) {
      return { userId: '', isValid: false };
    }

    if (user.status !== UserStatus.active) {
      throw new BadReqErr(ErrCode.UserNotActive);
    }

    const isValid = await this.deps.passwordService.comparePassword(
      password,
      user.password,
    );

    return { userId: user.id, isValid };
  }

  async validateUserStatus(userId: string): Promise<void> {
    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!user) {
      throw new BadReqErr(ErrCode.UserNotFound);
    }

    if (user.status !== UserStatus.active) {
      throw new BadReqErr(ErrCode.UserNotActive);
    }
  }
}
