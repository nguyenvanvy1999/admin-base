import { db } from '@server/db';
import { usersTable } from '@server/db/schema';
import { appEnv } from '@server/env';
import { eq } from 'drizzle-orm';
import { Elysia } from 'elysia';
import * as jwt from 'jsonwebtoken';

export class UserService {
  async register(username: string, password: string) {
    const existUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (existUser.length > 0) {
      throw new Error('User already exists');
    }

    const hashPassword = await Bun.password.hash(password, 'bcrypt');
    const [newUser] = await db
      .insert(usersTable)
      .values({
        username,
        password: hashPassword,
        role: 'user',
      })
      .returning();

    return newUser;
  }

  async login(username: string, password: string) {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    const user = users[0];
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
      appEnv.JWT_SECRET,
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

  async getUserInfo(id: number) {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    const user = users[0];
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
