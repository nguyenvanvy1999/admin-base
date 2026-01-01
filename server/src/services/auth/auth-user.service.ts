import { db, type IDb } from 'src/config/db';
import { type ICurrentUser, userResSelect } from 'src/share';
import { assertUserActive, assertUserExists } from './auth-errors.util';
import { type UserUtilService, userUtilService } from './auth-util.service';

export class AuthUserService {
  constructor(
    private readonly deps: {
      db: IDb;
      userUtilService: UserUtilService;
    } = {
      db,
      userUtilService,
    },
  ) {}

  async loadUserWithPermissions(
    userId: string,
    options?: { checkStatus?: boolean },
  ): Promise<ICurrentUser> {
    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: userResSelect,
    });

    assertUserExists(user);

    if (options?.checkStatus !== false) {
      assertUserActive(user);
    }

    const activeRoleIds = await this.deps.userUtilService.getActiveRoleIds(
      user.id,
    );
    const permissions = await this.deps.userUtilService.getPermissions(user);

    return {
      ...user,
      permissions,
      roleIds: activeRoleIds,
      notificationPreferences: null,
      sessionId: '',
    };
  }

  async loadUserForAuth(userId: string) {
    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: {
        ...userResSelect,
        mfaTotpEnabled: true,
        totpSecret: true,
      },
    });

    assertUserExists(user);
    assertUserActive(user);

    return user;
  }
}

export const authUserService = new AuthUserService();
