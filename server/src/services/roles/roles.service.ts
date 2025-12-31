import { db, type IDb } from 'src/config/db';
import type { RoleListParams, UpsertRoleParams } from 'src/dtos/roles.dto';
import {
  AuditLogVisibility,
  type PermissionWhereInput,
  type RoleWhereInput,
} from 'src/generated';
import { auditLogsService } from 'src/services/audit-logs/audit-logs.service';
import {
  buildCreateChanges,
  buildUpdateChanges,
} from 'src/services/audit-logs/utils';
import { normalizeSearchTerm } from 'src/services/shared/utils';
import {
  BadReqErr,
  DB_PREFIX,
  ErrCode,
  IdUtil,
  type IIdsDto,
  NotFoundErr,
  UnAuthErr,
} from 'src/share';
import type { AuditLogsService } from '../audit-logs';

export class RolesService {
  constructor(
    private readonly deps: {
      db: IDb;
      auditLogService: AuditLogsService;
    },
  ) {}

  private buildPermissionData(permissionIds: string[]) {
    return permissionIds.map((permId) => ({
      id: IdUtil.dbId(),
      permissionId: permId,
    }));
  }

  private buildPlayerData(players: UpsertRoleParams['players']) {
    return players.map((player) => ({
      id: IdUtil.dbId(),
      playerId: player.playerId,
      expiresAt: player.expiresAt ? new Date(player.expiresAt) : null,
    }));
  }

  async list(params: RoleListParams) {
    const { userId, search } = params;
    const where: RoleWhereInput = {};
    if (userId) {
      where.players = {
        some: { player: { id: userId } },
      };
    }

    const normalizedSearch = normalizeSearchTerm(search);
    if (normalizedSearch) {
      where.AND = [
        {
          OR: [
            {
              title: {
                contains: normalizedSearch,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: normalizedSearch,
                mode: 'insensitive',
              },
            },
          ],
        },
      ];
    }

    const roles = await this.deps.db.role.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        protected: true,
        enabled: true,
        permissions: { select: { permissionId: true } },
        _count: {
          select: {
            players: true,
          },
        },
      },
    });

    const now = new Date();

    const roleIds = roles.map((r) => r.id);

    const activePlayersByRole =
      roleIds.length === 0
        ? []
        : await this.deps.db.rolePlayer.groupBy({
            by: ['roleId'],
            where: {
              roleId: { in: roleIds },
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
            _count: {
              _all: true,
            },
          });

    const activeMap = new Map<string, number>();
    for (const item of activePlayersByRole) {
      activeMap.set(item.roleId, item._count._all);
    }

    return roles.map((role) => {
      const totalPlayers = role._count.players;
      const activePlayers = activeMap.get(role.id) ?? 0;
      const expiredPlayers = Math.max(totalPlayers - activePlayers, 0);

      return {
        ...role,
        permissionIds: role.permissions.map((p) => p.permissionId),
        totalPlayers,
        activePlayers,
        expiredPlayers,
      };
    });
  }

  async upsert(params: UpsertRoleParams): Promise<{ id: string }> {
    const { id, title, enabled, description, players, permissionIds } = params;

    if (id) {
      const targetRole = await this.deps.db.role.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          enabled: true,
          protected: true,
          permissions: { select: { permissionId: true } },
          players: { select: { playerId: true } },
        },
      });
      if (!targetRole) {
        throw new NotFoundErr(ErrCode.ItemNotFound);
      }
      if (targetRole.protected) {
        throw new UnAuthErr(ErrCode.PermissionDenied);
      }

      const permissionIdsBefore = targetRole.permissions.map(
        (p) => p.permissionId,
      );
      const playerIdsBefore = targetRole.players.map((p) => p.playerId);

      const updated = await this.deps.db.role.update({
        where: { id },
        data: {
          description,
          title,
          enabled,
          permissions: {
            deleteMany: {
              roleId: id,
              permissionId: { notIn: permissionIds },
            },
            createMany: {
              skipDuplicates: true,
              data: this.buildPermissionData(permissionIds),
            },
          },
          players: {
            deleteMany: {
              roleId: id,
            },
            createMany: {
              skipDuplicates: true,
              data: this.buildPlayerData(players),
            },
          },
        },
        select: { id: true },
      });

      const playerIdsAfter = players.map((p) => p.playerId);

      const changes = buildUpdateChanges(
        {
          ...targetRole,
          permissionIds: permissionIdsBefore,
          playerIds: playerIdsBefore,
        },
        {
          title,
          description,
          enabled,
          permissionIds,
          playerIds: playerIdsAfter,
        },
      );

      await this.deps.auditLogService.pushCud(
        {
          category: 'cud',
          entityType: 'role',
          entityId: id,
          action: 'update',
          changes,
        },
        { visibility: AuditLogVisibility.admin_only },
      );

      return { id: updated.id };
    } else {
      const roleId = IdUtil.dbId(DB_PREFIX.ROLE);
      const created = await this.deps.db.role.create({
        data: {
          id: roleId,
          description,
          title,
          enabled,
          permissions: {
            createMany: {
              data: this.buildPermissionData(permissionIds),
            },
          },
          players: {
            createMany: {
              data: this.buildPlayerData(players),
            },
          },
        },
        select: { id: true },
      });

      const changes = buildCreateChanges({
        title,
        description,
        enabled,
        permissionIds,
        playerIds: players.map((p) => p.playerId),
      });

      await this.deps.auditLogService.pushCud(
        {
          category: 'cud',
          entityType: 'role',
          entityId: roleId,
          action: 'create',
          changes,
        },
        { visibility: AuditLogVisibility.admin_only },
      );

      return { id: created.id };
    }
  }

  async detail(id: string) {
    const select = {
      id: true,
      title: true,
      description: true,
      protected: true,
      enabled: true,
      permissions: { select: { permissionId: true } },
      players: {
        select: {
          expiresAt: true,
          player: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      },
    } as const;

    const roleResult = await this.deps.db.role.findUnique({
      where: { id },
      select,
    });

    if (!roleResult) {
      throw new NotFoundErr(ErrCode.ItemNotFound);
    }

    const role = roleResult;

    return {
      id: role.id,
      title: role.title,
      description: role.description,
      protected: role.protected,
      enabled: role.enabled,
      permissionIds: role.permissions.map((p) => p.permissionId),
      players: role.players.map((rp) => ({
        id: rp.player.id,
        email: rp.player.email,
        expiresAt: rp.expiresAt ? rp.expiresAt.toISOString() : null,
      })),
    };
  }

  async delete(params: IIdsDto): Promise<void> {
    const { ids } = params;
    const protectedRoles = await this.deps.db.role.findMany({
      where: { id: { in: ids }, protected: true },
      select: { id: true },
    });
    if (protectedRoles.length > 0) {
      throw new UnAuthErr(ErrCode.PermissionDenied);
    }
    const existUserRole = await this.deps.db.rolePlayer.findFirst({
      where: { roleId: { in: ids } },
    });
    if (existUserRole) {
      throw new BadReqErr(ErrCode.ActionNotAllowed);
    }

    await this.deps.db.role.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    await this.deps.auditLogService.pushCud(
      {
        category: 'cud',
        entityType: 'role',
        entityId: ids[0] ?? 'bulk',
        action: 'delete',
        changes: { roleIds: { previous: ids, next: [] } },
      },
      { visibility: AuditLogVisibility.admin_only },
    );
  }

  listPermissions(params: { roleId?: string }) {
    const { roleId } = params;
    const where: PermissionWhereInput = roleId
      ? { roles: { some: { roleId } } }
      : {};
    return this.deps.db.permission.findMany({
      where,
      orderBy: { title: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
      },
    });
  }
}

export const rolesService = new RolesService({
  db,
  auditLogService: auditLogsService,
});
