import { db, type IDb } from 'src/config/db';

export class UserIpWhitelistAdminService {
  constructor(private readonly deps: { db: IDb }) {}

  list(userId: string) {
    return this.deps.db.userIpWhitelist.findMany({
      where: { userId },
      orderBy: { created: 'desc' },
    });
  }

  add(userId: string, ip: string) {
    return this.deps.db.userIpWhitelist.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        ip,
      },
    });
  }

  remove(userId: string, id: string) {
    return this.deps.db.userIpWhitelist.delete({
      where: {
        id,
        userId,
      },
    });
  }
}

export const userIpWhitelistAdminService = new UserIpWhitelistAdminService({
  db,
});
