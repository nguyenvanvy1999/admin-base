import { db, type IDb } from 'src/config/db';
import type {
  CreateNotificationParams,
  NotificationListParams,
} from 'src/dtos/notification.dto';
import {
  AuditLogVisibility,
  type NotificationSelect,
  type NotificationWhereInput,
} from 'src/generated';
import { auditLogsService } from 'src/services/audit-logs/audit-logs.service';
import {
  buildCreateChanges,
  buildDeleteChanges,
} from 'src/services/audit-logs/audit-logs.utils';
import {
  applyPermissionFilter,
  buildSearchOrCondition,
  DB_PREFIX,
  ErrCode,
  ensureExists,
  executeListQuery,
  type IdUtil,
  idUtil,
  normalizeSearchTerm,
} from 'src/share';
import type { AuditLogsService } from '../audit-logs';

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
  constructor(
    private readonly deps: {
      db: IDb;
      auditLogService: AuditLogsService;
      idUtil: IdUtil;
    },
  ) {}

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
    const notificationId = this.deps.idUtil.dbId(DB_PREFIX.NOTIFICATION);

    const created = await this.deps.db.notification.create({
      data: {
        id: notificationId,
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

    const changes = buildCreateChanges({
      userId,
      templateId: templateId || null,
      type,
      status: 'pending',
      subject: subject || null,
      content,
      metadata: metadata || null,
    });

    await this.deps.auditLogService.pushCud(
      {
        category: 'cud',
        entityType: 'notification',
        entityId: notificationId,
        action: 'create',
        changes,
      },
      {
        visibility: AuditLogVisibility.actor_only,
        subjectUserId: userId,
        entityDisplay: { userId, type },
      },
    );

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

    const notificationsToDelete = await this.deps.db.notification.findMany({
      where,
      select: {
        id: true,
        userId: true,
        type: true,
        status: true,
        subject: true,
        content: true,
        metadata: true,
      },
    });

    await this.deps.db.notification.deleteMany({
      where,
    });

    if (notificationsToDelete.length > 0) {
      const auditEntries = notificationsToDelete.map((notification) => ({
        type: 'cud' as const,
        payload: {
          category: 'cud' as const,
          entityType: 'notification' as const,
          entityId: notification.id,
          action: 'delete' as const,
          changes: buildDeleteChanges({
            userId: notification.userId,
            type: notification.type,
            status: notification.status,
            subject: notification.subject,
            content: notification.content,
            metadata: notification.metadata,
          }),
          entityDisplay: {
            userId: notification.userId,
            type: notification.type,
          },
        },
      }));

      await this.deps.auditLogService.pushBatch(auditEntries);
    }
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
  auditLogService: auditLogsService,
  idUtil,
});
