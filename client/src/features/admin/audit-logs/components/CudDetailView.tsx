import { Descriptions, Divider, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { AdminAuditLog } from 'src/types/admin-audit-logs';
import { ACTION_COLORS, getEntityDisplayTitle } from '../utils/auditLogUtils';
import { ContextInfo } from './ContextInfo';
import { DiffViewer } from './DiffViewer';

interface CudDetailViewProps {
  record: AdminAuditLog;
}

export function CudDetailView({ record }: CudDetailViewProps) {
  const { t } = useTranslation();
  const payload = record.payload as {
    action?: string;
    changes?: Record<string, { previous: unknown; next: unknown }>;
    entityType?: string;
    entityId?: string;
  };

  const action = payload.action || 'unknown';
  const changes = payload.changes;
  const entityTitle = getEntityDisplayTitle(record.entityDisplay);

  return (
    <>
      <Descriptions column={2} bordered>
        <Descriptions.Item label={t('common.fields.entityType')}>
          {record.entityType || '-'}
        </Descriptions.Item>
        <Descriptions.Item label={t('common.fields.entityId')}>
          {record.entityId ? (
            <Typography.Text code copyable>
              {record.entityId}
            </Typography.Text>
          ) : (
            '-'
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t('auditLogsPage.fields.action')}>
          <Tag color={ACTION_COLORS[action] || 'default'}>
            {action.toUpperCase()}
          </Tag>
        </Descriptions.Item>
        {entityTitle && (
          <Descriptions.Item label={t('auditLogsPage.fields.entityTitle')}>
            {entityTitle}
          </Descriptions.Item>
        )}
      </Descriptions>

      {action === 'update' && changes && Object.keys(changes).length > 0 && (
        <>
          <Divider>{t('auditLogsPage.sections.changes')}</Divider>
          <DiffViewer changes={changes} />
        </>
      )}

      {action === 'create' && record.entityDisplay && (
        <>
          <Divider>{t('auditLogsPage.sections.createdEntity')}</Divider>
          <Typography.Paragraph>
            <pre
              style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}
            >
              {JSON.stringify(record.entityDisplay, null, 2)}
            </pre>
          </Typography.Paragraph>
        </>
      )}

      <Divider>{t('auditLogsPage.sections.context')}</Divider>
      <ContextInfo record={record} />
    </>
  );
}
