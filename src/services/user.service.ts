import { prisma } from '@server/db';
import type { User } from '@server/generated/prisma/client';
import { Elysia } from 'elysia';
import * as jwt from 'jsonwebtoken';

export class UserService {
  async register(username: string, password: string): Promise<User> {
    const existUser = await prisma.user.findFirst({
      where: { username },
    });
    if (existUser) {
      throw new Error('User already exists');
    }
    const hashPassword = await Bun.password.hash(password, 'bcrypt');
    return prisma.user.create({
      data: {
        username,
        password: hashPassword,
        role: 'user',
      },
    });
  }

  async login(
    username: string,
    password: string,
  ): Promise<{
    user: {
      id: number;
      username: string;
      role: string;
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
      { id: Number(user.id), role: user.role },
      process.env.JWT_SECRET ?? '',
    );

    return {
      user: {
        id: Number(user.id),
        username: user.username,
        role: user.role,
      },
      jwt: token,
    };
  }

  async getUserInfo(id: number): Promise<{
    id: number;
    username: string;
    role: string;
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
