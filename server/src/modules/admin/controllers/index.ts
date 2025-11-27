import { Elysia } from 'elysia';
import { adminCoreController } from 'src/modules/admin/controllers/admin-core.controller';
import { adminUserController } from 'src/modules/admin/controllers/admin-user.controller';
import { authCheck } from 'src/service/auth/auth.middleware';
import { ACCESS_AUTH } from 'src/share';

export const adminController = new Elysia({
  prefix: '/admin',
  detail: { security: ACCESS_AUTH },
})
  .use(authCheck)
  .use(adminCoreController)
  .use(adminUserController);
