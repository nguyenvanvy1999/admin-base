import { db, type IDb } from 'src/config/db';
import type {
  NotificationTemplateListParams,
  UpsertNotificationTemplateParams,
} from 'src/dtos/notification-templates.dto';
import {
  AuditLogVisibility,
  type NotificationTemplateSelect,
  type NotificationTemplateWhereInput,
} from 'src/generated';
import { auditLogsService } from 'src/services/audit-logs/audit-logs.service';
import {
  buildCreateChanges,
  buildDeleteChanges,
  buildUpdateChanges,
} from 'src/services/audit-logs/audit-logs.utils';
import {
  BadReqErr,
  buildSearchOrCondition,
  DB_PREFIX,
  ErrCode,
  ensureExists,
  executeListQuery,
  type IdUtil,
  type IIdsDto,
  idUtil,
  normalizeSearchTerm,
} from 'src/share';
import type { AuditLogsService } from '../audit-logs';

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
  constructor(
    private readonly deps: {
      db: IDb;
      auditLogService: AuditLogsService;
      idUtil: IdUtil;
    },
  ) {}

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
      const existingTemplate = await ensureExists(
        this.deps.db.notificationTemplate,
        { id },
        {
          id: true,
          code: true,
          name: true,
          subject: true,
          body: true,
          type: true,
          variables: true,
          enabled: true,
        },
        ErrCode.NotificationTemplateNotFound,
      );

      await this.ensureCodeUnique(code, id);
      const updated = await this.deps.db.notificationTemplate.update({
        where: { id },
        data: payload,
        select: { id: true },
      });

      const changes = buildUpdateChanges(
        {
          code: existingTemplate.code,
          name: existingTemplate.name,
          subject: existingTemplate.subject,
          body: existingTemplate.body,
          type: existingTemplate.type,
          variables: existingTemplate.variables,
          enabled: existingTemplate.enabled,
        },
        payload,
      );

      await this.deps.auditLogService.pushCud(
        {
          category: 'cud',
          entityType: 'notification_template',
          entityId: id,
          action: 'update',
          changes,
        },
        {
          visibility: AuditLogVisibility.admin_only,
          entityDisplay: { code, name: payload.name },
        },
      );

      return { id: updated.id };
    }

    await this.ensureCodeUnique(code);
    const templateId = this.deps.idUtil.dbId(DB_PREFIX.NOTIFICATION_TEMPLATE);
    const created = await this.deps.db.notificationTemplate.create({
      data: {
        id: templateId,
        ...payload,
      },
      select: { id: true },
    });

    const changes = buildCreateChanges(payload);

    await this.deps.auditLogService.pushCud(
      {
        category: 'cud',
        entityType: 'notification_template',
        entityId: templateId,
        action: 'create',
        changes,
      },
      {
        visibility: AuditLogVisibility.admin_only,
        entityDisplay: { code, name: payload.name },
      },
    );

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

    const templatesToDelete = await this.deps.db.notificationTemplate.findMany({
      where: {
        id: { in: ids },
      },
      select: {
        id: true,
        code: true,
        name: true,
        subject: true,
        body: true,
        type: true,
        variables: true,
        enabled: true,
      },
    });

    await this.deps.db.notificationTemplate.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    if (templatesToDelete.length > 0) {
      const auditEntries = templatesToDelete.map((template) => ({
        type: 'cud' as const,
        payload: {
          category: 'cud' as const,
          entityType: 'notification_template' as const,
          entityId: template.id,
          action: 'delete' as const,
          changes: buildDeleteChanges({
            code: template.code,
            name: template.name,
            subject: template.subject,
            body: template.body,
            type: template.type,
            variables: template.variables,
            enabled: template.enabled,
          }),
          entityDisplay: { code: template.code, name: template.name },
        },
      }));

      await this.deps.auditLogService.pushBatch(auditEntries);
    }
  }
}

export const notificationTemplatesService = new NotificationTemplatesService({
  db,
  auditLogService: auditLogsService,
  idUtil,
});
