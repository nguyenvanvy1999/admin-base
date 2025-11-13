import { UserRole } from '@server/generated/prisma/enums';
import type { UserUncheckedUpdateInput } from '@server/generated/prisma/models/User';
import { prisma } from '@server/libs/db';
import { userUtilService } from '@server/service/auth/auth-util.service';
import { DB_PREFIX, defaultRoles, IdUtil, SUPER_ADMIN_ID } from '@server/share';
import { Elysia } from 'elysia';
import { CURRENCY_IDS } from '../constants/currency';
import { ErrorCode, throwAppError } from '../constants/error';
import type {
  AuthUserRes,
  ILoginDto,
  IRegisterDto,
  IUpdateProfileDto,
  LoginRes,
} from '../dto/user.dto';
import { CategoryService } from './category.service';

const USER_SELECT_FOR_INFO = {
  id: true,
  username: true,
  name: true,
  role: true,
  baseCurrencyId: true,
  settings: true,
  createdAt: true,
  updatedAt: true,
  roles: { select: { roleId: true } },
} as const;

const USER_SELECT_FOR_VALIDATION = {
  id: true,
  password: true,
} as const;

const USER_SELECT_FOR_LOGIN = {
  id: true,
  username: true,
  role: true,
  name: true,
  baseCurrencyId: true,
  settings: true,
  password: true,
  createdAt: true,
  updatedAt: true,
  roles: { select: { roleId: true } },
} as const;

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

    if (data.newPassword) {
      if (!data.oldPassword) {
        throwAppError(
          ErrorCode.VALIDATION_ERROR,
          'Old password is required to change password',
        );
      }
      const isValid = await this.deps.passwordService.verify(
        data.oldPassword,
        user.password,
      );
      if (!isValid) {
        throwAppError(ErrorCode.INVALID_OLD_PASSWORD, 'Invalid old password');
      }
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
    if (data.newPassword) {
      updateData.password = await this.deps.passwordService.hash(
        data.newPassword,
      );
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
