import { ServiceBase } from '@client/libs/ServiceBase';
import type { RoleListResponse } from '@server/dto/admin/role.dto';

export type IUpsertRoleDto = {
  id?: string;
  enabled: boolean;
  title: string;
  description?: string | null;
  permissionIds: string[];
  playerIds: string[];
};

export class RoleService extends ServiceBase {
  constructor() {
    super('/api/admin/roles');
  }

  listRoles(query?: {
    search?: string;
    userId?: string;
    page?: number;
    limit?: number;
    sortBy?: 'title' | 'created';
    sortOrder?: 'asc' | 'desc';
  }): Promise<RoleListResponse> {
    return this.get<RoleListResponse>({
      endpoint: '/api/admin/roles',
      params: query,
    });
  }

  createRole(data: Omit<IUpsertRoleDto, 'id'>): Promise<null> {
    return this.post<null>(data, {
      endpoint: '/api/admin/roles',
    });
  }

  updateRole(data: IUpsertRoleDto): Promise<null> {
    return this.post<null>(data, {
      endpoint: '/api/admin/roles',
    });
  }

  deleteRole(id: string): Promise<null> {
    return this.post<null>(
      { ids: [id] },
      {
        endpoint: '/api/admin/roles/del',
      },
    );
  }

  deleteManyRoles(ids: string[]): Promise<null> {
    return this.post<null>(
      { ids },
      {
        endpoint: '/api/admin/roles/del',
      },
    );
  }
}

export const roleService = new RoleService();
