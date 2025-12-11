import {
  type IUserIpWhitelistCache,
  userIpWhitelistCache,
} from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import type {
  IpWhitelistListParams,
  UpsertIpWhitelistParams,
} from 'src/dtos/ip-whitelist.dto';
import type {
  UserIpWhitelistSelect,
  UserIpWhitelistWhereInput,
} from 'src/generated';
import { DB_PREFIX, ErrCode, IdUtil, NotFoundErr } from '../../share';

const ipWhitelistSelect = {
  id: true,
  ip: true,
  userId: true,
  note: true,
  created: true,
} satisfies UserIpWhitelistSelect;

export class UserIpWhitelistService {
  constructor(
    private readonly deps: { db: IDb; cache: IUserIpWhitelistCache } = {
      db,
      cache: userIpWhitelistCache,
    },
  ) {}

  private normalizeIp(ip: string): string {
    return ip.trim().toLowerCase();
  }

  private isLocalIp(ip: string): boolean {
    return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip);
  }

  private async getUserIps(userId: string): Promise<string[]> {
    const cached = await this.deps.cache.get(userId);
    if (cached) {
      return cached;
    }

    const ips = await this.deps.db.userIpWhitelist.findMany({
      where: { userId },
      select: { ip: true },
    });
    const normalized = ips.map((item) => this.normalizeIp(item.ip));
    await this.deps.cache.set(userId, normalized);
    return normalized;
  }

  private invalidateCache(userId: string) {
    return this.deps.cache.del(userId);
  }

  async isIpAllowed(userId: string, clientIp: string | null): Promise<boolean> {
    if (!clientIp) {
      return false;
    }

    const normalizedIp = this.normalizeIp(clientIp);
    if (this.isLocalIp(normalizedIp)) {
      return true;
    }

    const allowedIps = await this.getUserIps(userId);

    if (allowedIps.length === 0) {
      return true;
    }

    return allowedIps.includes(normalizedIp);
  }

  async list(params: IpWhitelistListParams) {
    const {
      userIds,
      userId,
      ip,
      search,
      take = 20,
      skip = 0,
      currentUserId,
      hasViewPermission,
    } = params;
    const where: UserIpWhitelistWhereInput = {};

    if (!hasViewPermission) {
      where.userId = currentUserId;
    } else {
      if (userIds?.length) {
        where.userId = { in: userIds };
      } else if (userId) {
        where.userId = userId;
      }
    }

    if (ip) {
      where.ip = { contains: ip, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { ip: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [docs, count] = await Promise.all([
      this.deps.db.userIpWhitelist.findMany({
        where,
        orderBy: { created: 'desc' },
        take,
        skip,
        select: ipWhitelistSelect,
      }),
      this.deps.db.userIpWhitelist.count({ where }),
    ]);

    return { docs, count };
  }

  async detail(
    id: string,
    params: {
      currentUserId: string;
      hasViewPermission: boolean;
    },
  ) {
    const { currentUserId, hasViewPermission } = params;
    const where: UserIpWhitelistWhereInput = { id };

    if (!hasViewPermission) {
      where.userId = currentUserId;
    }

    const doc = await this.deps.db.userIpWhitelist.findFirst({
      where,
      select: {
        ...ipWhitelistSelect,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!doc) {
      throw new NotFoundErr(ErrCode.IPWhitelistNotFound);
    }

    return doc;
  }

  async upsert(
    data: UpsertIpWhitelistParams,
    params: {
      currentUserId: string;
      hasViewPermission: boolean;
    },
  ): Promise<{ id: string }> {
    const { userId, ip, note, id } = data;
    const { currentUserId, hasViewPermission } = params;

    if (id) {
      const where: UserIpWhitelistWhereInput = { id };
      if (!hasViewPermission) {
        where.userId = currentUserId;
      }

      const existing = await this.deps.db.userIpWhitelist.findFirst({
        where,
        select: { id: true, userId: true },
      });
      if (!existing) {
        throw new NotFoundErr(ErrCode.IPWhitelistNotFound);
      }

      const updated = await this.deps.db.userIpWhitelist.update({
        where: { id },
        data: { ip, note },
        select: { id: true },
      });
      await this.invalidateCache(existing.userId);
      return { id: updated.id };
    } else {
      const finalUserId = hasViewPermission ? userId : currentUserId;

      const created = await this.deps.db.userIpWhitelist.create({
        data: {
          id: IdUtil.dbId(DB_PREFIX.IP_WHITELIST),
          userId: finalUserId,
          ip,
          note,
        },
        select: { id: true },
      });
      await this.invalidateCache(finalUserId);
      return { id: created.id };
    }
  }

  async removeMany(
    ids: string[],
    params: {
      currentUserId: string;
      hasViewPermission: boolean;
    },
  ) {
    const { currentUserId, hasViewPermission } = params;
    const where: UserIpWhitelistWhereInput = {
      id: { in: ids },
    };

    if (!hasViewPermission) {
      where.userId = currentUserId;
    }

    const affectedUsers = await this.deps.db.userIpWhitelist.findMany({
      where,
      select: { userId: true },
    });

    await this.deps.db.userIpWhitelist.deleteMany({ where });

    const uniqueUserIds = [
      ...new Set(affectedUsers.map((item) => item.userId)),
    ];
    await Promise.all(
      uniqueUserIds.map((userId) => this.invalidateCache(userId)),
    );
  }
}

export const userIpWhitelistService = new UserIpWhitelistService({
  db,
  cache: userIpWhitelistCache,
});
