import { appEnv } from '@server/configs/env';
import { Elysia } from 'elysia';
import * as jwt from 'jsonwebtoken';

const authMacro = new Elysia().macro({
  checkAuth(roles: string[]) {
    return {
      resolve({ headers }) {
        const token = headers.authorization;
        if (!token) {
          throw new Error('Token not found');
        }
        const jwtToken = token.split(' ')[1];
        const decoded = jwt.verify(jwtToken, appEnv.JWT_SECRET) as {
          id: string;
          role: string;
        };
        if (!decoded.id) {
          throw new Error('Invalid token: user id not found');
        }
        const user = {
          id: decoded.id,
          role: decoded.role,
        };
        if (!roles.includes(user.role)) {
          throw new Error('Permission denied');
        }
        return { user };
      },
    };
  },
});

export default authMacro;
