import { db, type IDb } from 'src/config/db';
import type { RoleListParams, UpsertRoleParams } from 'src/dtos/roles.dto';
import type { RoleWhereInput } from 'src/generated';
import { ensureExists, normalizeSearchTerm } from 'src/service/utils';
import {
  BadReqErr,
  DB_PREFIX,
  ErrCode,
  IdUtil,
  type IIdsDto,
  NotFoundErr,
  UnAuthErr,
} from 'src/share';

export class RolesService {
  constructor(
    private readonly deps: {
      db: IDb;
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
      const targetRole = await ensureExists(
        this.deps.db.role,
        { id },
        { id: true, protected: true },
        ErrCode.ItemNotFound,
      );
      if (targetRole.protected) {
        throw new UnAuthErr(ErrCode.PermissionDenied);
      }
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
      return { id: updated.id };
    } else {
      const created = await this.deps.db.role.create({
        data: {
          id: IdUtil.dbId(DB_PREFIX.ROLE),
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
  }
}

export const rolesService = new RolesService({ db });
