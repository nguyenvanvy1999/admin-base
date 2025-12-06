import { db, type IDb } from 'src/config/db';
import type {
  UserIpWhitelistSelect,
  UserIpWhitelistWhereInput,
} from 'src/generated';
import type {
  IpWhitelistPaginationDto,
  UpsertIpWhitelistDto,
} from 'src/modules/ip-whitelist/ip-whitelist.dto';
import { DB_PREFIX, ErrCode, IdUtil, NotFoundErr } from '../../share';

const ipWhitelistSelect = {
  id: true,
  ip: true,
  userId: true,
  note: true,
  created: true,
} satisfies UserIpWhitelistSelect;
export class UserIpWhitelistAdminService {
  constructor(private readonly deps: { db: IDb }) {}

  async list(query: typeof IpWhitelistPaginationDto.static) {
    const { userIds, userId, ip, search, take = 20, skip = 0 } = query;
    const where: UserIpWhitelistWhereInput = {};

    // Filter by user IDs
    if (userIds?.length) {
      where.userId = { in: userIds };
    } else if (userId) {
      where.userId = userId;
    }

    // Filter by IP (partial match)
    if (ip) {
      where.ip = { contains: ip, mode: 'insensitive' };
    }

    // Search functionality
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

  async detail(id: string, userId?: string) {
    const where: UserIpWhitelistWhereInput = { id };

    if (userId) {
      where.userId = userId;
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
    data: typeof UpsertIpWhitelistDto.static,
    restrictToUserId?: string,
  ) {
    const { userId, ip, note, id } = data;

    if (id) {
      const where: UserIpWhitelistWhereInput = { id };
      if (restrictToUserId) {
        where.userId = restrictToUserId;
      }

      await this.deps.db.userIpWhitelist.update({
        where: { id, userId: where.userId },
        data: { ip, note },
        select: { id: true },
      });
    } else {
      await this.deps.db.userIpWhitelist.create({
        data: {
          id: IdUtil.dbId(DB_PREFIX.IP_WHITELIST),
          userId,
          ip,
          note,
        },
        select: { id: true },
      });
    }
  }

  async removeMany(ids: string[], restrictToUserId?: string) {
    const where: UserIpWhitelistWhereInput = {
      id: { in: ids },
    };

    if (restrictToUserId) {
      where.userId = restrictToUserId;
    }

    await this.deps.db.userIpWhitelist.deleteMany({
      where,
    });
  }
}

export const userIpWhitelistAdminService = new UserIpWhitelistAdminService({
  db,
});
