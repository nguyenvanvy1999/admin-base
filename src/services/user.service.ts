import { type IDb, prisma } from '@server/configs/db';
import type { Prisma, UserUncheckedUpdateInput } from '@server/generated';
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
  IListUsersQueryDto,
  IUpsertUserDto,
  IUserStatisticsQueryDto,
  UserListResponse,
  UserResponse,
  UserStatisticsResponse,
} from '../dto/admin/user.dto';
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
      user,
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

  async listUsersAdmin(query: IListUsersQueryDto): Promise<UserListResponse> {
    const {
      search,
      page,
      limit,
      sortBy = 'created',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.UserWhereInput = {};

    if (search && search.trim()) {
      where.OR = [
        { username: { contains: search.trim(), mode: 'insensitive' } },
        { name: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    if (sortBy === 'username') {
      orderBy.username = sortOrder;
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'created') {
      orderBy.created = sortOrder;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.deps.db.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          name: true,
          baseCurrencyId: true,
          created: true,
          modified: true,
          baseCurrency: {
            select: {
              id: true,
              code: true,
              name: true,
              symbol: true,
            },
          },
          roles: {
            select: {
              role: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      }),
      this.deps.db.user.count({ where }),
    ]);

    return {
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        baseCurrencyId: user.baseCurrencyId,
        created: user.created.toISOString(),
        modified: user.modified.toISOString(),
        baseCurrency: user.baseCurrency
          ? {
              id: user.baseCurrency.id,
              code: user.baseCurrency.code,
              name: user.baseCurrency.name,
              symbol: user.baseCurrency.symbol,
            }
          : null,
        roles: user.roles.map((rp) => ({
          id: rp.role.id,
          title: rp.role.title,
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserByIdAdmin(id: string): Promise<UserResponse> {
    const user = await this.deps.db.user.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
        username: true,
        name: true,
        baseCurrencyId: true,
        created: true,
        modified: true,
        baseCurrency: {
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true,
          },
        },
        roles: {
          select: {
            role: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throwAppError(ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      baseCurrencyId: user.baseCurrencyId,
      created: user.created.toISOString(),
      modified: user.modified.toISOString(),
      baseCurrency: user.baseCurrency
        ? {
            id: user.baseCurrency.id,
            code: user.baseCurrency.code,
            name: user.baseCurrency.name,
            symbol: user.baseCurrency.symbol,
          }
        : null,
      roles: user.roles.map((rp) => ({
        id: rp.role.id,
        title: rp.role.title,
      })),
    };
  }

  async getUserStatistics(
    query: IUserStatisticsQueryDto,
  ): Promise<UserStatisticsResponse> {
    const { dateFrom, dateTo, groupBy = 'month' } = query;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const dateFromDate = dateFrom ? new Date(dateFrom) : undefined;
    const dateToDate = dateTo ? new Date(dateTo) : undefined;

    const baseWhere: Prisma.UserWhereInput = {};

    const [
      totalUsers,
      newUsersThisMonth,
      newUsersThisWeek,
      adminUsers,
      regularUsers,
    ] = await Promise.all([
      this.deps.db.user.count({ where: baseWhere }),
      this.deps.db.user.count({
        where: {
          ...baseWhere,
          created: { gte: startOfMonth },
        },
      }),
      this.deps.db.user.count({
        where: {
          ...baseWhere,
          created: { gte: startOfWeek },
        },
      }),
      this.deps.db.user.count({
        where: {
          ...baseWhere,
          roles: {
            some: {
              roleId: defaultRoles.admin.id,
            },
          },
        },
      }),
      this.deps.db.user.count({
        where: {
          ...baseWhere,
          roles: {
            some: {
              roleId: defaultRoles.user.id,
            },
          },
        },
      }),
    ]);

    const roleCounts = {
      admin: adminUsers,
      user: regularUsers,
    };

    const timeSeriesWhere: Prisma.UserWhereInput = {
      ...baseWhere,
      ...(dateFromDate || dateToDate
        ? {
            created: {
              ...(dateFromDate ? { gte: dateFromDate } : {}),
              ...(dateToDate ? { lte: dateToDate } : {}),
            },
          }
        : {}),
    };

    const allUsers = await this.deps.db.user.findMany({
      where: timeSeriesWhere,
      select: {
        created: true,
      },
      orderBy: {
        created: 'asc',
      },
    });

    const statsMap = new Map<string, { count: number; newUsers: number }>();

    let cumulativeCount = 0;
    const filterStartDate = dateFromDate || allUsers[0]?.created;
    if (filterStartDate) {
      const startDate = new Date(filterStartDate);
      if (groupBy === 'day') {
        startDate.setHours(0, 0, 0, 0);
      } else if (groupBy === 'week') {
        startDate.setDate(startDate.getDate() - startDate.getDay());
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
      }

      const endDate = dateToDate || now;
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        let dateKey: string;
        if (groupBy === 'day') {
          dateKey = currentDate.toISOString().split('T')[0];
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (groupBy === 'week') {
          dateKey = currentDate.toISOString().split('T')[0];
          currentDate.setDate(currentDate.getDate() + 7);
        } else {
          dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
        statsMap.set(dateKey, { count: cumulativeCount, newUsers: 0 });
      }
    }

    for (const user of allUsers) {
      const date = new Date(user.created);
      let dateKey: string;
      if (groupBy === 'day') {
        dateKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
      } else {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!statsMap.has(dateKey)) {
        statsMap.set(dateKey, { count: cumulativeCount, newUsers: 0 });
      }

      const stats = statsMap.get(dateKey)!;
      stats.newUsers++;
      cumulativeCount++;
      stats.count = cumulativeCount;
    }

    const userGrowthTimeSeries = Array.from(statsMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        newUsers: data.newUsers,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalUsers,
      newUsersThisMonth,
      newUsersThisWeek,
      usersByRole: roleCounts,
      userGrowthTimeSeries,
    };
  }

  async upsertUserAdmin(data: IUpsertUserDto): Promise<void> {
    const { id, username, password, name, baseCurrencyId } = data;

    if (id && id === SUPER_ADMIN_ID) {
      throwAppError(ErrorCode.PERMISSION_DENIED, 'Permission denied');
    }

    if (baseCurrencyId) {
      const currencyExists = await this.deps.db.currency.count({
        where: { id: baseCurrencyId },
      });
      if (currencyExists === 0) {
        throwAppError(ErrorCode.CURRENCY_NOT_FOUND, 'Currency not found');
      }
    }

    if (id) {
      const existingUser = await this.deps.db.user.findFirst({
        where: { id },
      });
      if (!existingUser) {
        throwAppError(ErrorCode.USER_NOT_FOUND, 'User not found');
      }

      if (username && username !== existingUser.username) {
        const usernameExists = await this.deps.db.user.findFirst({
          where: { username },
        });
        if (usernameExists) {
          throwAppError(ErrorCode.USER_ALREADY_EXISTS, 'User already exists');
        }
      }

      const updateData: Prisma.UserUncheckedUpdateInput = {
        username: username || existingUser.username,
        name: name ?? null,
        baseCurrencyId: baseCurrencyId ?? undefined,
      };

      if (password) {
        const hashedPassword =
          await this.deps.passwordService.createPassword(password);
        updateData.password = hashedPassword.password;
        updateData.passwordCreated = hashedPassword.passwordCreated;
        updateData.passwordExpired = hashedPassword.passwordExpired;
      }

      await this.deps.db.user.update({
        where: { id },
        data: updateData,
      });
    } else {
      const usernameExists = await this.deps.db.user.findFirst({
        where: { username },
      });
      if (usernameExists) {
        throwAppError(ErrorCode.USER_ALREADY_EXISTS, 'User already exists');
      }

      if (!password) {
        throwAppError(ErrorCode.VALIDATION_ERROR, 'Password is required');
      }

      const passwordData =
        await this.deps.passwordService.createPassword(password);

      await this.deps.db.user.create({
        data: {
          id: this.deps.idUtil.dbId(DB_PREFIX.USER),
          username,
          ...passwordData,
          name: name ?? null,
          baseCurrencyId: baseCurrencyId || CURRENCY_IDS.VND,
        },
      });
    }
  }

  async deleteUsersAdmin(ids: string[]): Promise<void> {
    if (ids.includes(SUPER_ADMIN_ID)) {
      throwAppError(ErrorCode.PERMISSION_DENIED, 'Permission denied');
    }

    await this.deps.db.user.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  }
}

export const userService = new UserService();
