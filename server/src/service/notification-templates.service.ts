import { db, type IDb } from 'src/config/db';
import type {
  NotificationTemplateSelect,
  NotificationTemplateWhereInput,
} from 'src/generated';
import type {
  NotificationTemplatePaginationDto,
  UpsertNotificationTemplateDto,
} from 'src/modules/notification-templates';
import {
  BadReqErr,
  DB_PREFIX,
  ErrCode,
  IdUtil,
  type IIdsDto,
  NotFoundErr,
} from 'src/share';

const notificationTemplateSelect = {
  id: true,
  code: true,
  name: true,
  subject: true,
  body: true,
  type: true,
  variables: true,
  enabled: true,
  created: true,
  modified: true,
} satisfies NotificationTemplateSelect;

export class NotificationTemplatesService {
  constructor(private readonly deps: { db: IDb }) {}

  async list(query: typeof NotificationTemplatePaginationDto.static) {
    const { type, enabled, search, take = 20, skip = 0 } = query;
    const where: NotificationTemplateWhereInput = {};

    if (type) {
      where.type = type;
    }

    if (enabled !== undefined) {
      where.enabled = enabled;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [docs, count] = await Promise.all([
      this.deps.db.notificationTemplate.findMany({
        where,
        orderBy: { created: 'desc' },
        take,
        skip,
        select: notificationTemplateSelect,
      }),
      this.deps.db.notificationTemplate.count({ where }),
    ]);

    return { docs, count };
  }

  async detail(id: string) {
    const template = await this.deps.db.notificationTemplate.findUnique({
      where: { id },
      select: {
        ...notificationTemplateSelect,
        _count: {
          select: {
            notifications: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundErr(ErrCode.NotificationTemplateNotFound);
    }

    return template;
  }

  async upsert(data: typeof UpsertNotificationTemplateDto.static) {
    const { id, code, name, subject, body, type, variables, enabled } = data;

    if (id) {
      const existing = await this.deps.db.notificationTemplate.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundErr(ErrCode.NotificationTemplateNotFound);
      }

      const codeExists = await this.deps.db.notificationTemplate.findFirst({
        where: {
          code,
          id: { not: id },
        },
        select: { id: true },
      });

      if (codeExists) {
        throw new BadReqErr(ErrCode.NotificationTemplateCodeExists);
      }

      await this.deps.db.notificationTemplate.update({
        where: { id },
        data: {
          code,
          name,
          subject: subject || null,
          body,
          type,
          variables: variables || null,
          enabled: enabled ?? true,
        },
        select: { id: true },
      });
    } else {
      const codeExists = await this.deps.db.notificationTemplate.findUnique({
        where: { code },
        select: { id: true },
      });

      if (codeExists) {
        throw new BadReqErr(ErrCode.NotificationTemplateCodeExists);
      }

      await this.deps.db.notificationTemplate.create({
        data: {
          id: IdUtil.dbId(DB_PREFIX.NOTIFICATION_TEMPLATE),
          code,
          name,
          subject: subject || null,
          body,
          type,
          variables: variables || null,
          enabled: enabled ?? true,
        },
        select: { id: true },
      });
    }
  }

  async removeMany(params: IIdsDto) {
    const { ids } = params;

    const templatesInUse = await this.deps.db.notification.findFirst({
      where: {
        templateId: { in: ids },
      },
      select: { id: true },
    });

    if (templatesInUse) {
      throw new BadReqErr(ErrCode.ActionNotAllowed);
    }

    await this.deps.db.notificationTemplate.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  }
}

export const notificationTemplatesService = new NotificationTemplatesService({
  db,
});
