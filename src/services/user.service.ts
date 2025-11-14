import { prisma } from '@server/configs/db';
import { UserRole } from '@server/generated/prisma/enums';
import type { UserUncheckedUpdateInput } from '@server/generated/prisma/models/User';
import { userUtilService } from '@server/services/auth/auth-util.service';
import { DB_PREFIX, defaultRoles, IdUtil, SUPER_ADMIN_ID } from '@server/share';
import { CURRENCY_IDS } from '@server/share/constants/currency';
import { ErrorCode, throwAppError } from '@server/share/constants/error';
import { Elysia } from 'elysia';
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
  role: UserRole;
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

export interface IDb {
  user: typeof prisma.user;
  currency: typeof prisma.currency;
  rolePlayer: typeof prisma.rolePlayer;
  $transaction: typeof prisma.$transaction;
}

export class UserService {
  constructor(
    private readonly deps: {
      db: IDb;
      categoryService: CategoryService;
      passwordService: {
        hash: (password: string) => Promise<string>;
        verify: (password: string, hash: string) => Promise<boolean>;
      };
    } = {
      db: prisma as unknown as IDb,
      categoryService: new CategoryService(),
      passwordService: {
        hash: (password: string) => Bun.password.hash(password, 'bcrypt'),
        verify: (password: string, hash: string) =>
          Bun.password.verify(password, hash, 'bcrypt'),
      },
    },
  ) {}

  async register(data: IRegisterDto) {
    const existUser = await this.deps.db.user.findFirst({
      where: { username: data.username },
    });
    if (existUser) {
      throwAppError(ErrorCode.USER_ALREADY_EXISTS, 'User already exists');
    }

    const hashPassword = await this.deps.passwordService.hash(data.password);

    const user = await this.deps.db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: data.username,
          password: hashPassword,
          name: data.name,
          role: UserRole.user,
          baseCurrencyId: CURRENCY_IDS.VND,
        },
      });

      await this.deps.categoryService.seedDefaultCategories(tx, newUser.id);

      await tx.rolePlayer.create({
        data: {
          id: IdUtil.dbId(DB_PREFIX.ROLE),
          playerId: newUser.id,
          roleId: defaultRoles.user.id,
        },
      });

      return newUser;
    });

    const userWithRoles = await this.deps.db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
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
    const isValid = await this.deps.passwordService.verify(
      data.password,
      user.password,
    );
    if (!isValid) {
      throwAppError(ErrorCode.INVALID_PASSWORD, 'Invalid password');
    }

    const loginRes = await userUtilService.completeLogin(
      user as typeof user & {
        roles: { roleId: string }[];
        deletedAt: Date | null;
      },
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
        role: user.role,
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

    const isValid = await this.deps.passwordService.verify(
      data.oldPassword,
      user.password,
    );
    if (!isValid) {
      throwAppError(ErrorCode.INVALID_OLD_PASSWORD, 'Invalid old password');
    }

    const hashedPassword = await this.deps.passwordService.hash(
      data.newPassword,
    );

    const updatedUser = await this.deps.db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
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

    const updateData: UserUncheckedUpdateInput = {};

    if (data.name?.length) {
      updateData.name = data.name;
    }
    if (data.baseCurrencyId) {
      updateData.baseCurrencyId = data.baseCurrencyId;
    }

    const updatedUser = await this.deps.db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        baseCurrencyId: true,
      },
    });

    return formatUser(updatedUser);
  }
}

export default new Elysia().decorate('userService', new UserService());
