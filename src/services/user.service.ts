import { type IDb, prisma } from '@server/configs/db';
import type { UserUncheckedUpdateInput } from '@server/generated';
import { userUtilService } from '@server/services/auth/auth-util.service';
import {
  type PasswordService,
  passwordService,
} from '@server/services/auth/password.service';
import {
  CURRENCY_IDS,
  DB_PREFIX,
  defaultRoles,
  ErrorCode,
  type IdUtil,
  idUtil,
  SUPER_ADMIN_ID,
  throwAppError,
} from '@server/share';
import type {
  AuthUserRes,
  IChangePasswordDto,
  ILoginDto,
  IRegisterDto,
  IUpdateProfileDto,
  LoginRes,
} from '../dto/user.dto';
import { CategoryService } from './category.service';
import {
  USER_SELECT_FOR_INFO,
  USER_SELECT_FOR_LOGIN,
  USER_SELECT_FOR_VALIDATION,
} from './selects';

const formatUser = (user: {
  id: string;
  username: string;
  name: string | null;
  baseCurrencyId: string | null;
  permissions?: string[];
  roleIds?: string[];
}): AuthUserRes => ({
  ...user,
  name: user.name ?? null,
  baseCurrencyId: user.baseCurrencyId ?? null,
  permissions: user.permissions ?? [],
  roleIds: user.roleIds ?? [],
  isSuperAdmin: user.id === SUPER_ADMIN_ID,
});

export class UserService {
  constructor(
    private readonly deps: {
      db: IDb;
      categoryService: CategoryService;
      passwordService: PasswordService;
      idUtil: IdUtil;
    } = {
      db: prisma,
      categoryService: new CategoryService(),
      passwordService,
      idUtil,
    },
  ) {}

  async register(data: IRegisterDto) {
    const existUser = await this.deps.db.user.findFirst({
      where: { username: data.username },
    });
    if (existUser) {
      throwAppError(ErrorCode.USER_ALREADY_EXISTS, 'User already exists');
    }

    const password = await this.deps.passwordService.createPassword(
      data.password,
    );

    const user = await this.deps.db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          id: this.deps.idUtil.dbId(DB_PREFIX.USER),
          username: data.username,
          name: data.name,
          baseCurrencyId: CURRENCY_IDS.VND,
          ...password,
          roles: {
            create: {
              roleId: defaultRoles.user.id,
            },
          },
        },
        select: { id: true },
      });

      await this.deps.categoryService.seedDefaultCategories(tx, newUser.id);

      return newUser;
    });

    const userWithRoles = await this.deps.db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        name: true,
        baseCurrencyId: true,
        roles: { select: { roleId: true } },
      },
    });

    if (!userWithRoles) {
      throwAppError(ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    const permissions = await userUtilService.getPermissions(userWithRoles);

    return formatUser({
      ...userWithRoles,
      permissions,
      roleIds: userWithRoles.roles.map((r) => r.roleId),
    });
  }

  async login(
    data: ILoginDto,
    clientIp: string,
    userAgent: string,
  ): Promise<LoginRes> {
    const user = await this.deps.db.user.findFirst({
      where: { username: data.username },
      select: USER_SELECT_FOR_LOGIN,
    });
    if (!user) {
      throwAppError(ErrorCode.USER_NOT_FOUND, 'User not found');
    }
    const isValid = await this.deps.passwordService.comparePassword(
      data.password,
      user.password,
    );
    if (!isValid) {
      throwAppError(ErrorCode.INVALID_PASSWORD, 'Invalid password');
    }

    const loginRes = await userUtilService.completeLogin(
      user as any as Parameters<typeof userUtilService.completeLogin>[0],
      clientIp,
      userAgent,
    );

    return {
      accessToken: loginRes.accessToken,
      refreshToken: loginRes.refreshToken,
      exp: loginRes.exp,
      expired: loginRes.expired,
      user: {
        id: loginRes.user.id,
        username: loginRes.user.username,
        name: loginRes.user.name,
        baseCurrencyId: loginRes.user.baseCurrencyId,
        permissions: loginRes.user.permissions,
        roleIds: user.roles.map((r) => r.roleId),
        isSuperAdmin: user.id === SUPER_ADMIN_ID,
      },
    };
  }

  async getUserInfo(id: string) {
    const user = await this.deps.db.user.findFirst({
      where: { id },
      select: USER_SELECT_FOR_INFO,
    });
    if (!user) {
      throwAppError(ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    const permissions = await userUtilService.getPermissions(user);

    return {
      ...formatUser(user),
      permissions,
      roleIds: user.roles.map((r) => r.roleId),
    };
  }

  async changePassword(userId: string, data: IChangePasswordDto) {
    if (userId === SUPER_ADMIN_ID) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'Super admin account cannot be modified',
      );
    }

    const user = await this.deps.db.user.findFirst({
      where: { id: userId },
      select: USER_SELECT_FOR_VALIDATION,
    });
    if (!user) {
      throwAppError(ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    const isValid = await this.deps.passwordService.comparePassword(
      data.oldPassword,
      user.password,
    );
    if (!isValid) {
      throwAppError(ErrorCode.INVALID_OLD_PASSWORD, 'Invalid old password');
    }

    const password = await this.deps.passwordService.createPassword(
      data.newPassword,
    );

    const updatedUser = await this.deps.db.user.update({
      where: { id: userId },
      data: password,
      select: {
        id: true,
        username: true,
        name: true,
        baseCurrencyId: true,
      },
    });

    return formatUser(updatedUser);
  }

  async updateProfile(userId: string, data: IUpdateProfileDto) {
    if (userId === SUPER_ADMIN_ID) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'Super admin account cannot be modified',
      );
    }

    const user = await this.deps.db.user.findFirst({
      where: { id: userId },
      select: USER_SELECT_FOR_VALIDATION,
    });
    if (!user) {
      throwAppError(ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    if (data.baseCurrencyId) {
      const count = await this.deps.db.currency.count({
        where: { id: data.baseCurrencyId },
      });
      if (count === 0) {
        throwAppError(ErrorCode.CURRENCY_NOT_FOUND, 'Currency not found');
      }
    }

    const modifieda: UserUncheckedUpdateInput = {};

    if (data.name?.length) {
      modifieda.name = data.name;
    }
    if (data.baseCurrencyId) {
      modifieda.baseCurrencyId = data.baseCurrencyId;
    }

    const updatedUser = await this.deps.db.user.update({
      where: { id: userId },
      data: modifieda,
      select: {
        id: true,
        username: true,
        name: true,
        baseCurrencyId: true,
      },
    });

    return formatUser(updatedUser);
  }
}

export const userService = new UserService();
