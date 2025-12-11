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
  constructor(private readonly deps: { db: IDb }) {}

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
        select: { id: true },
      });
      if (!existing) {
        throw new NotFoundErr(ErrCode.IPWhitelistNotFound);
      }

      const updated = await this.deps.db.userIpWhitelist.update({
        where: { id },
        data: { ip, note },
        select: { id: true },
      });
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

    await this.deps.db.userIpWhitelist.deleteMany({
      where,
    });
  }
}

export const userIpWhitelistService = new UserIpWhitelistService({
  db,
});
