import { db, type IDb } from 'src/config/db';
import type {
  NotificationTemplateListParams,
  UpsertNotificationTemplateParams,
} from 'src/dtos/notification-templates.dto';
import type {
  NotificationTemplateSelect,
  NotificationTemplateWhereInput,
} from 'src/generated';
import {
  buildSearchOrCondition,
  ensureExists,
  executeListQuery,
  normalizeSearchTerm,
} from 'src/service/utils';
import { BadReqErr, DB_PREFIX, ErrCode, IdUtil, type IIdsDto } from 'src/share';

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

  private async ensureCodeUnique(code: string, excludeId?: string) {
    const codeExists = await this.deps.db.notificationTemplate.findFirst({
      where: { code, ...(excludeId && { id: { not: excludeId } }) },
      select: { id: true },
    });

    if (codeExists) {
      throw new BadReqErr(ErrCode.NotificationTemplateCodeExists);
    }
  }

  private buildData(data: UpsertNotificationTemplateParams) {
    const { code, name, subject, body, type, variables, enabled } = data;
    return {
      code,
      name,
      subject: subject || null,
      body,
      type,
      variables: variables || null,
      enabled: enabled ?? true,
    };
  }

  list(query: NotificationTemplateListParams) {
    const { type, enabled, search, take, skip } = query;
    const where: NotificationTemplateWhereInput = {};

    if (type) {
      where.type = type;
    }

    if (enabled !== undefined) {
      where.enabled = enabled;
    }

    const normalizedSearch = normalizeSearchTerm(search);
    if (normalizedSearch) {
      Object.assign(
        where,
        buildSearchOrCondition<NotificationTemplateWhereInput>(
          ['code', 'name', 'subject'],
          normalizedSearch,
        ),
      );
    }

    return executeListQuery(this.deps.db.notificationTemplate, {
      where,
      orderBy: { created: 'desc' },
      take,
      skip,
      select: notificationTemplateSelect,
    });
  }

  detail(id: string) {
    return ensureExists(
      this.deps.db.notificationTemplate,
      { id },
      {
        ...notificationTemplateSelect,
        _count: {
          select: {
            notifications: true,
          },
        },
      },
      ErrCode.NotificationTemplateNotFound,
    );
  }

  async upsert(
    data: UpsertNotificationTemplateParams,
  ): Promise<{ id: string }> {
    const { id, code } = data;
    const payload = this.buildData(data);

    if (id) {
      await ensureExists(
        this.deps.db.notificationTemplate,
        { id },
        { id: true },
        ErrCode.NotificationTemplateNotFound,
      );
      await this.ensureCodeUnique(code, id);
      const updated = await this.deps.db.notificationTemplate.update({
        where: { id },
        data: payload,
        select: { id: true },
      });
      return { id: updated.id };
    }

    await this.ensureCodeUnique(code);
    const created = await this.deps.db.notificationTemplate.create({
      data: {
        id: IdUtil.dbId(DB_PREFIX.NOTIFICATION_TEMPLATE),
        ...payload,
      },
      select: { id: true },
    });
    return { id: created.id };
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
