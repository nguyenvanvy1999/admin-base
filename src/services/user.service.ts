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

export class UserService {
  private categoryService = new CategoryService();

  async register(data: IRegisterDto) {
    const existUser = await prisma.user.findFirst({
      where: { username: data.username },
    });
    if (existUser) {
      throw new Error('User already exists');
    }
    const hashPassword = await Bun.password.hash(data.password, 'bcrypt');

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: data.username,
          password: hashPassword,
          name: data.name,
          role: UserRole.user,
          baseCurrencyId: CURRENCY_IDS.VND,
        },
      });

      await this.categoryService.seedDefaultCategories(tx, newUser.id);

      return newUser;
    });

    return {
      id: user.id,
      username: user.username,
      name: user.name ?? null,
      role: user.role,
      baseCurrencyId: user.baseCurrencyId ?? null,
    } satisfies AuthUserRes;
  }

  async login(data: ILoginDto) {
    const user = await prisma.user.findFirst({
      where: { username: data.username },
      select: USER_SELECT_FOR_LOGIN,
    });
    if (!user) {
      throw new Error('User not found');
    }
    const isValid = await Bun.password.verify(
      data.password,
      user.password,
      'bcrypt',
    );
    if (!isValid) {
      throw new Error('Invalid password');
    }
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET ?? '',
    );

    return {
      user: {
        id: user.id,
        username: user.username,
        name: user.name ?? null,
        role: user.role,
        baseCurrencyId: user.baseCurrencyId ?? null,
      },
      jwt: token,
    } satisfies LoginRes;
  }

  async getUserInfo(id: string) {
    const user = await prisma.user.findFirst({
      where: { id },
      select: USER_SELECT_FOR_INFO,
    });
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user.id,
      username: user.username,
      name: user.name ?? null,
      role: user.role,
      baseCurrencyId: user.baseCurrencyId ?? null,
    } satisfies AuthUserRes;
  }

  async updateProfile(userId: string, data: IUpdateProfileDto) {
    const user = await prisma.user.findFirst({
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
      const isValid = await Bun.password.verify(
        data.oldPassword,
        user.password,
        'bcrypt',
      );
      if (!isValid) {
        throw new Error('Invalid old password');
      }
    }

    if (data.baseCurrencyId) {
      const count = await prisma.currency.count({
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
      updateData.password = await Bun.password.hash(data.newPassword, 'bcrypt');
    }

    const updatedUser = await prisma.user.update({
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

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name ?? null,
      role: updatedUser.role,
      baseCurrencyId: updatedUser.baseCurrencyId ?? null,
    } satisfies AuthUserRes;
  }
}

export default new Elysia().decorate('userService', new UserService());
