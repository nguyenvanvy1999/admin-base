import { prisma } from '@server/db';
import type { User } from '@server/generated/prisma/client';
import { UserRole } from '@server/generated/prisma/enums';
import { Elysia } from 'elysia';
import * as jwt from 'jsonwebtoken';
import { CURRENCY_IDS } from '../constants/currency';
import { CategoryService } from './category.service';

export class UserService {
  private categoryService = new CategoryService();

  async register(username: string, password: string): Promise<User> {
    const existUser = await prisma.user.findFirst({
      where: { username },
    });
    if (existUser) {
      throw new Error('User already exists');
    }
    const hashPassword = await Bun.password.hash(password, 'bcrypt');
    const user = await prisma.user.create({
      data: {
        username,
        password: hashPassword,
        role: UserRole.user,
        baseCurrencyId: CURRENCY_IDS.VND,
      },
    });

    await this.categoryService.seedDefaultCategories(user.id);

    return user;
  }

  async login(
    username: string,
    password: string,
  ): Promise<{
    user: {
      id: string;
      username: string;
      role: UserRole;
    };
    jwt: string;
  }> {
    const user = await prisma.user.findFirst({
      where: { username },
    });
    if (!user) {
      throw new Error('User not found');
    }
    const isValid = await Bun.password.verify(
      password,
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

  async getUserInfo(id: string): Promise<{
    id: string;
    username: string;
    role: UserRole;
  }> {
    const user = await prisma.user.findFirst({
      where: { id },
    });
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }
}

export default new Elysia().decorate('userService', new UserService());
