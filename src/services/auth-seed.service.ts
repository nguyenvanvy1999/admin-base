import { prisma } from '@server/libs/db';
import { defaultRoles, PERMISSIONS } from '@server/share/constant';

export class AuthSeedService {
  async seedRolesAndPermissions(): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const perms = PERMISSIONS as unknown as Record<
        string,
        Record<string, { roles: string[] }>
      >;

      const permissionMap = new Map<string, string>();

      for (const [category, actions] of Object.entries(perms)) {
        for (const [action] of Object.entries(actions)) {
          const permTitle = `${category}.${action}`;
          const permId = `perm_${permTitle.toLowerCase().replace(/\./g, '_')}`;

          await tx.permission.upsert({
            where: { title: permTitle },
            update: {},
            create: {
              id: permId,
              title: permTitle,
              description: `Permission for ${permTitle}`,
            },
          });

          permissionMap.set(permTitle, permId);
        }
      }

      for (const [_key, role] of Object.entries(defaultRoles)) {
        const createdRole = await tx.role.upsert({
          where: { id: role.id },
          update: {
            title: role.title,
            description: role.description,
            enabled: true,
          },
          create: {
            id: role.id,
            title: role.title,
            description: role.description,
            enabled: true,
          },
        });

        const permissionIds: string[] = [];

        for (const [category, actions] of Object.entries(perms)) {
          for (const [action, permData] of Object.entries(actions)) {
            if (permData.roles.includes(role.id)) {
              const permTitle = `${category}.${action}`;
              const permId = permissionMap.get(permTitle);
              if (permId) {
                permissionIds.push(permId);
              }
            }
          }
        }

        await tx.rolePermission.deleteMany({
          where: { roleId: createdRole.id },
        });

        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({
              roleId: createdRole.id,
              permissionId,
            })),
            skipDuplicates: true,
          });
        }
      }
    });
  }
}
