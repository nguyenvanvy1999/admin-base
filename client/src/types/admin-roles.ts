export interface AdminRole {
  id: string;
  title: string;
  description?: string | null;
  permissionIds: string[];
  playerIds: string[];
}
