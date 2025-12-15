import { db, type IDb } from 'src/config/db';
import type {
  CreateNotificationParams,
  NotificationListParams,
} from 'src/dtos/notification.dto';
import type { NotificationSelect, NotificationWhereInput } from 'src/generated';
import { DB_PREFIX } from 'src/services/shared/constants';
import {
  applyPermissionFilter,
  buildSearchOrCondition,
  ensureExists,
  executeListQuery,
  normalizeSearchTerm,
} from 'src/services/shared/utils';
import { ErrCode, IdUtil } from 'src/share';

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

export class NotificationsService {
  constructor(private readonly deps: { db: IDb }) {}

  list(params: NotificationListParams) {
    const {
      userIds,
      userId,
      type,
      status,
      search,
      take,
      skip,
      currentUserId,
      hasViewPermission,
    } = params;

    let where: NotificationWhereInput = {};

    where = applyPermissionFilter(where, {
      currentUserId,
      hasViewPermission,
      userIds,
      userId,
    });

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    const normalizedSearch = normalizeSearchTerm(search);
    if (normalizedSearch) {
      Object.assign(
        where,
        buildSearchOrCondition<NotificationWhereInput>(
          ['subject', 'content'],
          normalizedSearch,
        ),
      );
    }

    return executeListQuery(this.deps.db.notification, {
      where,
      orderBy: { created: 'desc' },
      take,
      skip,
      select: notificationSelect,
    });
  }

  detail(
    id: string,
    params: {
      currentUserId: string;
      hasViewPermission: boolean;
    },
  ) {
    const { currentUserId, hasViewPermission } = params;
    let where: NotificationWhereInput = { id };

    where = applyPermissionFilter(where, {
      currentUserId,
      hasViewPermission,
    });

    return ensureExists(
      this.deps.db.notification,
      where,
      {
        ...notificationSelect,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      ErrCode.NotificationNotFound,
    );
  }

  async create(data: CreateNotificationParams): Promise<{ id: string }> {
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
