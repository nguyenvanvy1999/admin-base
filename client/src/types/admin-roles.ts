export interface RolePlayer {
  playerId: string;
  expiresAt: string | null;
}

export interface AdminRole {
  id: string;
  title: string;
  description?: string | null;
  permissionIds: string[];
  players: RolePlayer[];
  /**
   * Total number of users assigned to this role.
   * These values can be pre-computed by the API for performance,
   * but the UI can also fall back to calculating from "players".
   */
  totalPlayers?: number;
  /**
   * Number of users whose role assignment is still active (not expired).
   */
  activePlayers?: number;
  /**
   * Number of users whose role assignment has expired.
   */
  expiredPlayers?: number;
  protected?: boolean;
}

export interface UpsertRoleDto {
  id?: string;
  title: string;
  description?: string | null;
  enabled: boolean;
  permissionIds: string[];
  /**
   * List of players and their expiration time for this role.
   */
  players: RolePlayer[];
}

export interface AdminPermission {
  id: string;
  title: string;
  description?: string | null;
}
