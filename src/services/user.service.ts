import { UserRole } from '@server/generated/prisma/enums';
import type { UserUncheckedUpdateInput } from '@server/generated/prisma/models/User';
import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';
import * as jwt from 'jsonwebtoken';
import { CURRENCY_IDS } from '../constants/currency';
import type {
  ILoginDto,
  IRegisterDto,
  IUpdateProfileDto,
} from '../dto/user.dto';
import { CategoryService } from './category.service';

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

    return user;
  }

  async login(data: ILoginDto) {
    const user = await prisma.user.findFirst({
      where: { username: data.username },
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
        role: user.role,
      },
      jwt: token,
    };
  }

  async getUserInfo(id: string) {
    const user = await prisma.user.findFirst({
      where: { id },
    });
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      baseCurrencyId: user.baseCurrencyId,
    };
  }

  async updateProfile(userId: string, data: IUpdateProfileDto) {
    const user = await prisma.user.findFirst({
      where: { id: userId },
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
      const currency = await prisma.currency.findUnique({
        where: { id: data.baseCurrencyId },
      });
      if (!currency) {
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
    });

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
    };
  }
}

export default new Elysia().decorate('userService', new UserService());
