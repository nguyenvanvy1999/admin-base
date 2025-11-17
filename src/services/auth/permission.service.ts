import { type IDb, prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated';

export type PermissionResponse = {
  id: string;
  title: string;
  description: string | null;
};

export class PermissionService {
  constructor(private readonly deps: { db: IDb } = { db: prisma }) {}

  async listPermissions(roleId?: string): Promise<PermissionResponse[]> {
    const where: Prisma.PermissionWhereInput = roleId
      ? { roles: { some: { roleId } } }
      : {};
    const permissions = await this.deps.db.permission.findMany({
      where,
      orderBy: { title: 'desc' },
      select: { id: true, title: true, description: true },
    });
    return permissions.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
    }));
  }
}

export const permissionService = new PermissionService();
