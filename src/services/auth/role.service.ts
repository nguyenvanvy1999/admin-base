import { type IDb, prisma } from '@server/configs/db';
import type {
  IListRolesQueryDto,
  RoleListResponse,
  UpsertRoleDtoZod,
} from '@server/dto/admin';
import type { Prisma } from '@server/generated';
import {
  DB_PREFIX,
  defaultRoles,
  ErrorCode,
  type IdUtil,
  idUtil,
  throwAppError,
} from '@server/share';
import type { z } from 'zod';

type IUpsertRoleDto = z.infer<typeof UpsertRoleDtoZod>;

const FROZEN_ROLE_IDS = [defaultRoles.user.id, defaultRoles.admin.id];

function isFrozenRole(roleId: string): boolean {
  return FROZEN_ROLE_IDS.includes(roleId);
}

export class RoleService {
  constructor(
    private readonly deps: { db: IDb; idUtil: IdUtil } = { db: prisma, idUtil },
  ) {}

  async listRoles(query: IListRolesQueryDto): Promise<RoleListResponse> {
    const { search, userId, page, limit, sortBy, sortOrder } = query;

    const where: Prisma.RoleWhereInput = {};

    if (userId) {
      where.players = {
        some: { playerId: userId },
      };
    }

    if (search && search.trim()) {
      where.title = { contains: search.trim(), mode: 'insensitive' };
    }

    const orderBy: Prisma.RoleOrderByWithRelationInput = {};
    if (sortBy === 'title') {
      orderBy.title = sortOrder;
    } else if (sortBy === 'created') {
      orderBy.created = sortOrder;
    }

    const skip = (page - 1) * limit;

    const [roles, total] = await Promise.all([
      this.deps.db.role.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          enabled: true,
          created: true,
          modified: true,
          permissions: { select: { permissionId: true } },
          players: { select: { playerId: true } },
        },
      }),
      this.deps.db.role.count({ where }),
    ]);

    return {
      roles: roles.map((role) => ({
        id: role.id,
        title: role.title,
        description: role.description,
        enabled: role.enabled,
        permissionIds: role.permissions.map((p) => p.permissionId),
        playerIds: role.players.map((p) => p.playerId),
        created: role.created.toISOString(),
        modified: role.modified.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async upsertRole(
    data: IUpsertRoleDto,
    currentUserPermissions: string[],
  ): Promise<void> {
    const { id, title, enabled, description, playerIds, permissionIds } = data;

    if (id) {
      if (!currentUserPermissions.includes('ROLE.UPDATE')) {
        throwAppError(ErrorCode.PERMISSION_DENIED, 'Permission denied');
      }

      if (isFrozenRole(id)) {
        throwAppError(ErrorCode.PERMISSION_DENIED, 'Permission denied');
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
                playerId,
              })),
            },
          },
        },
        select: { id: true },
      });
    } else {
      if (!currentUserPermissions.includes('ROLE.CREATE')) {
        throwAppError(ErrorCode.PERMISSION_DENIED, 'Permission denied');
      }

      await this.deps.db.role.create({
        data: {
          id: this.deps.idUtil.dbId(DB_PREFIX.ROLE),
          description,
          title,
          enabled,
          permissions: {
            createMany: {
              data: permissionIds.map((permId) => ({
                permissionId: permId,
              })),
            },
          },
          players: {
            createMany: {
              data: playerIds.map((playerId) => ({
                playerId,
              })),
            },
          },
        },
        select: { id: true },
      });
    }
  }

  async deleteRoles(ids: string[]): Promise<void> {
    for (const roleId of ids) {
      if (isFrozenRole(roleId)) {
        throwAppError(ErrorCode.PERMISSION_DENIED, 'Permission denied');
      }
    }

    const existUserRole = await this.deps.db.rolePlayer.findFirst({
      where: { roleId: { in: ids } },
    });
    if (existUserRole) {
      throwAppError(ErrorCode.PERMISSION_DENIED, 'Permission denied');
    }

    await this.deps.db.role.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  }
}

export const roleService = new RoleService();
