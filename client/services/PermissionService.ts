import { ServiceBase } from '@client/libs/ServiceBase';

export type PermissionResponse = {
  id: string;
  title: string;
  description: string | null;
};

export class PermissionService extends ServiceBase {
  constructor() {
    super('/api/admin/permissions');
  }

  listPermissions(roleId?: string): Promise<PermissionResponse[]> {
    return this.get<PermissionResponse[]>({
      params: roleId ? { roleId } : undefined,
    });
  }
}

export const permissionService = new PermissionService();
