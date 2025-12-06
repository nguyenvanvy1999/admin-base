import { db, type IDb } from 'src/config/db';
import type { NotificationSelect, NotificationWhereInput } from 'src/generated';
import type {
  CreateNotificationDto,
  NotificationPaginationDto,
} from 'src/modules/notification/notification.dto';
import { DB_PREFIX, ErrCode, IdUtil, NotFoundErr } from '../../share';

const notificationSelect = {
  id: true,
  userId: true,
  templateId: true,
  type: true,
  status: true,
  subject: true,
  content: true,
  metadata: true,
  readAt: true,
  sentAt: true,
  failedAt: true,
  error: true,
  created: true,
} satisfies NotificationSelect;

type ListParams = typeof NotificationPaginationDto.static & {
  currentUserId: string;
  hasViewPermission: boolean;
};

export class NotificationsService {
  constructor(private readonly deps: { db: IDb }) {}

  async list(params: ListParams) {
    const {
      userIds,
      userId,
      type,
      status,
      search,
      take = 20,
      skip = 0,
      currentUserId,
      hasViewPermission,
    } = params;

    const where: NotificationWhereInput = {};

    if (!hasViewPermission) {
      where.userId = currentUserId;
    } else {
      if (userIds?.length) {
        where.userId = { in: userIds };
      } else if (userId) {
        where.userId = userId;
      }
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [docs, count] = await Promise.all([
      this.deps.db.notification.findMany({
        where,
        orderBy: { created: 'desc' },
        take,
        skip,
        select: notificationSelect,
      }),
      this.deps.db.notification.count({ where }),
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
    const where: NotificationWhereInput = { id };

    if (!hasViewPermission) {
      where.userId = currentUserId;
    }

    const doc = await this.deps.db.notification.findFirst({
      where,
      select: {
        ...notificationSelect,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!doc) {
      throw new NotFoundErr(ErrCode.NotificationNotFound);
    }

    return doc;
  }

  async create(
    data: typeof CreateNotificationDto.static,
  ): Promise<{ id: string }> {
    const { userId, templateId, type, subject, content, metadata } = data;

    const created = await this.deps.db.notification.create({
      data: {
        id: IdUtil.dbId(DB_PREFIX.NOTIFICATION),
        userId,
        templateId: templateId || null,
        type,
        status: 'pending',
        subject: subject || null,
        content,
        metadata: metadata || null,
      },
      select: { id: true },
    });
    return { id: created.id };
  }

  async removeMany(
    ids: string[],
    params: {
      currentUserId: string;
      hasViewPermission: boolean;
    },
  ) {
    const { currentUserId, hasViewPermission } = params;
    const where: NotificationWhereInput = {
      id: { in: ids },
    };

    if (!hasViewPermission) {
      where.userId = currentUserId;
    }

    await this.deps.db.notification.deleteMany({
      where,
    });
  }

  async markAsRead(
    ids: string[],
    params: {
      currentUserId: string;
      hasViewPermission: boolean;
    },
  ) {
    const { currentUserId, hasViewPermission } = params;
    const where: NotificationWhereInput = {
      id: { in: ids },
    };

    if (!hasViewPermission) {
      where.userId = currentUserId;
    }

    await this.deps.db.notification.updateMany({
      where,
      data: {
        status: 'read',
        readAt: new Date(),
      },
    });
  }
}

export const notificationsService = new NotificationsService({
  db,
});
