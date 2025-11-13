import { UserRole } from '@server/generated/prisma/enums';
import type { UserUncheckedUpdateInput } from '@server/generated/prisma/models/User';
import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';
import * as jwt from 'jsonwebtoken';
import { CURRENCY_IDS } from '../constants/currency';
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
  password: true,
} as const;

const formatUser = (user: {
  id: string;
  username: string;
  name: string | null;
  role: UserRole;
  baseCurrencyId: string | null;
}): AuthUserRes => ({
  ...user,
  name: user.name ?? null,
  baseCurrencyId: user.baseCurrencyId ?? null,
});

export interface IDb {
  user: typeof prisma.user;
  currency: typeof prisma.currency;
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
      throw new Error('User already exists');
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

      return newUser;
    });

    return formatUser(user);
  }

  async login(data: ILoginDto) {
    const user = await this.deps.db.user.findFirst({
      where: { username: data.username },
      select: USER_SELECT_FOR_LOGIN,
    });
    if (!user) {
      throw new Error('User not found');
    }
    const isValid = await this.deps.passwordService.verify(
      data.password,
      user.password,
    );
    if (!isValid) {
      throw new Error('Invalid password');
    }
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET ?? '',
    );

    return {
      user: formatUser(user),
      jwt: token,
    } satisfies LoginRes;
  }

  async getUserInfo(id: string) {
    const user = await this.deps.db.user.findFirst({
      where: { id },
      select: USER_SELECT_FOR_INFO,
    });
    if (!user) {
      throw new Error('User not found');
    }
    return formatUser(user);
  }

  async updateProfile(userId: string, data: IUpdateProfileDto) {
    const user = await this.deps.db.user.findFirst({
      where: { id: userId },
      select: USER_SELECT_FOR_VALIDATION,
    });
    if (!user) {
      throw new Error('User not found');
    }

    if (data.newPassword) {
      if (!data.oldPassword) {
        throw new Error('Old password is required to change password');
      }
      const isValid = await this.deps.passwordService.verify(
        data.oldPassword,
        user.password,
      );
      if (!isValid) {
        throw new Error('Invalid old password');
      }
    }

    if (data.baseCurrencyId) {
      const count = await this.deps.db.currency.count({
        where: { id: data.baseCurrencyId },
      });
      if (count === 0) {
        throw new Error('Currency not found');
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
