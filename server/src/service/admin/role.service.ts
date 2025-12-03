import { db, type IDb } from 'src/config/db';
import type { RoleWhereInput } from 'src/generated';
import type { RolePaginationDto, UpsertRoleDto } from 'src/modules/admin/dtos';
import {
  BadReqErr,
  ErrCode,
  type IIdsDto,
  NotFoundErr,
  UnAuthErr,
} from 'src/share';

type ListParams = typeof RolePaginationDto.static;
type UpsertParams = typeof UpsertRoleDto.static;

export class RoleService {
  constructor(
    private readonly deps: {
      db: IDb;
    } = {
      db,
    },
  ) {}

  async list(params: ListParams) {
    const { userId, search } = params;
    const where: RoleWhereInput = {};
    if (userId) {
      where.players = {
        some: { player: { id: userId } },
      };
    }

    if (search) {
      const trimmedSearch = search.trim();
      if (trimmedSearch.length > 0) {
        where.AND = [
          {
            OR: [
              {
                title: {
                  contains: trimmedSearch,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: trimmedSearch,
                  mode: 'insensitive',
                },
              },
            ],
          },
        ];
      }
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

      const { permissions, _count, ...rest } = role;

      return {
        ...rest,
        permissionIds: permissions.map((p) => p.permissionId),
        totalPlayers,
        activePlayers,
        expiredPlayers,
      };
    });
  }

  async upsert(params: UpsertParams): Promise<void> {
    const { id, title, enabled, description, players, permissionIds } = params;

    if (id) {
      const targetRole = await this.deps.db.role.findUnique({
        where: { id },
        select: { id: true, protected: true },
      });
      if (!targetRole) {
        throw new NotFoundErr(ErrCode.ItemNotFound);
      }
      if (targetRole.protected) {
        throw new UnAuthErr(ErrCode.PermissionDenied);
      }
      await this.deps.db.role.update({
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
              data: permissionIds.map((permId) => ({
                id: crypto.randomUUID(),
                permissionId: permId,
              })),
            },
          },
          players: {
            deleteMany: {
              roleId: id,
            },
            createMany: {
              skipDuplicates: true,
              data: players.map((player) => ({
                id: crypto.randomUUID(),
                playerId: player.playerId,
                expiresAt: player.expiresAt ? new Date(player.expiresAt) : null,
              })),
            },
          },
        },
        select: { id: true },
      });
    } else {
      await this.deps.db.role.create({
        data: {
          id: crypto.randomUUID(),
          description,
          title,
          enabled,
          permissions: {
            createMany: {
              data: permissionIds.map((permId) => ({
                id: crypto.randomUUID(),
                permissionId: permId,
              })),
            },
          },
          players: {
            createMany: {
              data: players.map((player) => ({
                id: crypto.randomUUID(),
                playerId: player.playerId,
                expiresAt: player.expiresAt ? new Date(player.expiresAt) : null,
              })),
            },
          },
        },
        select: { id: true },
      });
    }
  }

  async detail(id: string) {
    const role = await this.deps.db.role.findUnique({
      where: { id },
      select: {
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
      },
    });

    if (!role) {
      throw new NotFoundErr(ErrCode.ItemNotFound);
    }

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

export const roleService = new RoleService();
