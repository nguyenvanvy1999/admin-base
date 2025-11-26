import { authCheck } from '@server/services/auth/auth.middleware';
import { Elysia } from 'elysia';
import { permissionController } from './permission.controller';
import { roleController } from './role.controller';
import { sessionController } from './session.controller';
import { userController } from './user.controller';

export const adminController = new Elysia({
  prefix: '/admin',
})
  .use(authCheck)
  .use(permissionController)
  .use(roleController)
  .use(sessionController)
  .use(userController);
