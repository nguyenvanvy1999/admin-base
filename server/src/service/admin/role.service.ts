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
        players: { select: { playerId: true, expiresAt: true } },
      },
    });

    return roles.map((role) => ({
      ...role,
      permissionIds: role.permissions.map((p) => p.permissionId),
      players: role.players.map((p) => ({
        playerId: p.playerId,
        expiresAt: p.expiresAt?.toString() ?? null,
      })),
    }));
  }

  async upsert(params: UpsertParams): Promise<void> {
    const { id, title, enabled, description, playerIds, permissionIds } =
      params;

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
              playerId: { notIn: playerIds },
            },
            createMany: {
              skipDuplicates: true,
              data: playerIds.map((playerId) => ({
                id: crypto.randomUUID(),
                playerId,
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
              data: playerIds.map((playerId) => ({
                id: crypto.randomUUID(),
                playerId,
              })),
            },
          },
        },
        select: { id: true },
      });
    }
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
