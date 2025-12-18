import { Descriptions, Divider, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { AdminAuditLog } from 'src/types/admin-audit-logs';
import { ContextInfo } from './ContextInfo';

interface InternalDetailViewProps {
  record: AdminAuditLog;
}

export function InternalDetailView({ record }: InternalDetailViewProps) {
  const { t } = useTranslation();
  const payload = record.payload as {
    eventType?: string;
    metadata?: Record<string, unknown>;
  };

  return (
    <>
      <Descriptions column={2} bordered>
        <Descriptions.Item label={t('auditLogsPage.fields.eventType')}>
          {payload.eventType || record.eventType || '-'}
        </Descriptions.Item>
        <Descriptions.Item label={t('common.fields.level')}>
          {record.level.toUpperCase()}
        </Descriptions.Item>
        <Descriptions.Item label={t('common.fields.logType')}>
          {record.logType}
        </Descriptions.Item>
        {record.category && (
          <Descriptions.Item label={t('auditLogsPage.fields.category')}>
            {record.category}
          </Descriptions.Item>
        )}
      </Descriptions>

      {payload.metadata && Object.keys(payload.metadata).length > 0 && (
        <>
          <Divider>{t('auditLogsPage.sections.metadata')}</Divider>
          <Typography.Paragraph>
            <pre
              style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}
            >
              {JSON.stringify(payload.metadata, null, 2)}
            </pre>
          </Typography.Paragraph>
        </>
      )}

      <Divider>{t('auditLogsPage.sections.context')}</Divider>
      <ContextInfo record={record} />
    </>
  );
}
