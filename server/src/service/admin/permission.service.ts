import { db, type IDb } from 'src/config/db';
import type { PermissionWhereInput } from 'src/generated';

export class PermissionService {
  constructor(
    private readonly deps: {
      db: IDb;
    } = {
      db,
    },
  ) {}

  list(params: { roleId?: string }) {
    const { roleId } = params;
    const where: PermissionWhereInput = roleId
      ? { roles: { some: { roleId } } }
      : {};
    return this.deps.db.permission.findMany({
      where,
      orderBy: { title: 'desc' },
    });
  }
}

export const permissionService = new PermissionService();
