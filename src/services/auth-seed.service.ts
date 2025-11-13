import { prisma } from '@server/libs/db';
import { defaultRoles, PERMISSIONS } from '@server/share/constant';

export class AuthSeedService {
  async seedRolesAndPermissions(): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const permissions = [
        PERMISSIONS.ROLE.VIEW,
        PERMISSIONS.ROLE.UPDATE,
        PERMISSIONS.ROLE.DELETE,
        PERMISSIONS.SESSION.VIEW,
        PERMISSIONS.SESSION.REVOKE,
      ];

      for (const permTitle of permissions) {
        await tx.permission.upsert({
          where: { title: permTitle },
          update: {},
          create: {
            id: `perm_${permTitle.toLowerCase().replace(/\./g, '_')}`,
            title: permTitle,
            description: `Permission for ${permTitle}`,
          },
        });
      }

      for (const [key, role] of Object.entries(defaultRoles)) {
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
        if (key === 'admin') {
          permissionIds.push(
            ...permissions.map(
              (p) => `perm_${p.toLowerCase().replace(/\./g, '_')}`,
            ),
          );
        } else {
          permissionIds.push(
            `perm_${PERMISSIONS.SESSION.VIEW.toLowerCase().replace(/\./g, '_')}`,
          );
        }

        await tx.rolePermission.deleteMany({
          where: { roleId: createdRole.id },
        });

        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: createdRole.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }
    });
  }
}
