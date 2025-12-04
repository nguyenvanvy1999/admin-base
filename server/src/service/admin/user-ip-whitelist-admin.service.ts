import { db, type IDb } from 'src/config/db';
import type {
  CreateUserIpWhitelistDto,
  UserIpWhitelistListQueryDto,
} from 'src/modules/admin/dtos/user-ip-whitelist.dto';
import type { ICurrentUser } from 'src/share';

export class UserIpWhitelistAdminService {
  constructor(private readonly deps: { db: IDb }) {}

  async list(
    query: typeof UserIpWhitelistListQueryDto.static,
    currentUser: ICurrentUser,
  ) {
    const { userIds, ip, take, skip } = query;
    const where: any = {};

    const hasViewAll = currentUser.permissions.includes('IPWHITELIST.VIEW');

    if (!hasViewAll) {
      where.userId = currentUser.id;
    } else if (userIds) {
      where.userId = { in: userIds.split(',') };
    }

    if (ip) {
      where.ip = { contains: ip, mode: 'insensitive' };
    }

    const [docs, count] = await Promise.all([
      this.deps.db.userIpWhitelist.findMany({
        where,
        orderBy: { created: 'desc' },
        take,
        skip,
      }),
      this.deps.db.userIpWhitelist.count({ where }),
    ]);

    return { docs, count };
  }

  async upsert(
    data: typeof CreateUserIpWhitelistDto.static,
    currentUser: ICurrentUser,
  ) {
    const { userId, ip } = data;
    // Permission check could be here or in controller.
    // Assuming controller checks IPWHITELIST.UPDATE for general access.
    // If we want to allow users to upsert their own, we need to check here.
    const hasUpdate = currentUser.permissions.includes('IPWHITELIST.UPDATE');
    if (!hasUpdate && userId !== currentUser.id) {
      throw new Error('Permission denied'); // Or use a specific error class
    }

    const existing = await this.deps.db.userIpWhitelist.findUnique({
      where: { user_ip_whitelist_unique: { userId, ip } },
    });

    if (existing) {
      // Update? The model doesn't have many fields. Maybe just return it.
      // Or if we had a note field (which I added to DTO but not sure if in DB).
      // Checking schema... UserIpWhitelist has: id, userId, ip, created. NO NOTE.
      // Wait, schema says:
      // model UserIpWhitelist { ... id, userId, ip, created ... }
      // model IPWhitelist { ... ip, note ... } -> This is global whitelist?
      // The requirement says "User IP Whitelist".
      // I added `note` to DTO but DB doesn't have it.
      // I should probably remove `note` from DTO or add it to DB?
      // Requirement: "Upsert ( check quyền)".
      // If DB doesn't have note, I can't update it.
      // So Upsert = Create if not exists.
      return existing;
    }

    return this.deps.db.userIpWhitelist.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        ip,
      },
    });
  }

  async removeMany(ids: string[], currentUser: ICurrentUser) {
    const hasUpdate = currentUser.permissions.includes('IPWHITELIST.UPDATE');

    if (!hasUpdate) {
      // Only allow deleting own?
      // Need to check if these IDs belong to user.
      const items = await this.deps.db.userIpWhitelist.findMany({
        where: { id: { in: ids } },
        select: { id: true, userId: true },
      });
      for (const item of items) {
        if (item.userId !== currentUser.id) {
          throw new Error('Permission denied');
        }
      }
    }

    return this.deps.db.userIpWhitelist.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  }
}

export const userIpWhitelistAdminService = new UserIpWhitelistAdminService({
  db,
});
