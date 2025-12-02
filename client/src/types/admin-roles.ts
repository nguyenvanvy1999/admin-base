export interface AdminRole {
  id: string;
  title: string;
  description?: string | null;
  permissionIds: string[];
  playerIds: string[];
}

export interface UpsertRoleDto {
  id?: string;
  title: string;
  description?: string | null;
  enabled: boolean;
  permissionIds: string[];
  playerIds: string[];
}

export interface AdminPermission {
  id: string;
  title: string;
  description?: string | null;
}
