import { Elysia } from 'elysia';
import { adminI18nController } from 'src/modules/admin/controllers/admin-i18n.controller';
import { adminPermissionController } from 'src/modules/admin/controllers/admin-permission.controller';
import { adminRoleController } from 'src/modules/admin/controllers/admin-role.controller';
import { adminSessionController } from 'src/modules/admin/controllers/admin-session.controller';
import { adminSettingController } from 'src/modules/admin/controllers/admin-setting.controller';
import { adminUserController } from 'src/modules/admin/controllers/admin-user.controller';
import { authCheck } from 'src/service/auth/auth.middleware';
import { ACCESS_AUTH } from 'src/share';

export const adminController = new Elysia({
  prefix: '/admin',
  detail: { security: ACCESS_AUTH },
})
  .use(authCheck)
  .use(adminI18nController)
  .use(adminRoleController)
  .use(adminPermissionController)
  .use(adminSettingController)
  .use(adminSessionController)
  .use(adminUserController);
