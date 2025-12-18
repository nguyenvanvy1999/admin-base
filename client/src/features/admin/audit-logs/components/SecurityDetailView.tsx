import { Badge, Button, Descriptions, Divider, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminAuditLog } from 'src/types/admin-audit-logs';
import { SEVERITY_COLORS } from '../utils/auditLogUtils';
import { ContextInfo } from './ContextInfo';

interface SecurityDetailViewProps {
  record: AdminAuditLog;
  onResolve?: (id: string) => Promise<void>;
}

export function SecurityDetailView({
  record,
  onResolve,
}: SecurityDetailViewProps) {
  const { t } = useTranslation();
  const [resolving, setResolving] = useState(false);

  const payload = record.payload as {
    eventType?: string;
    severity?: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
      coordinates?: [number, number];
    };
    metadata?: Record<string, unknown>;
  };

  const handleResolve = async () => {
    if (!onResolve) return;
    try {
      setResolving(true);
      await onResolve(record.id);
    } finally {
      setResolving(false);
    }
  };

  return (
    <>
      <Descriptions column={2} bordered>
        <Descriptions.Item label={t('auditLogsPage.fields.eventType')}>
          {record.eventType ? (
            <Tag
              color={
                record.severity ? SEVERITY_COLORS[record.severity] : 'default'
              }
            >
              {record.eventType}
            </Tag>
          ) : (
            '-'
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t('auditLogsPage.fields.severity')}>
          {record.severity ? (
            <Tag color={SEVERITY_COLORS[record.severity]}>
              {record.severity.toUpperCase()}
            </Tag>
          ) : (
            '-'
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t('auditLogsPage.fields.status')}>
          {record.resolved ? (
            <Badge status="success" text={t('auditLogsPage.status.resolved')} />
          ) : (
            <Badge status="error" text={t('auditLogsPage.status.unresolved')} />
          )}
        </Descriptions.Item>
        {record.resolvedAt && (
          <Descriptions.Item label={t('auditLogsPage.fields.resolvedAt')}>
            {new Date(record.resolvedAt).toLocaleString()}
          </Descriptions.Item>
        )}
        {record.resolvedBy && (
          <Descriptions.Item label={t('auditLogsPage.fields.resolvedBy')}>
            <Typography.Text code copyable>
              {record.resolvedBy}
            </Typography.Text>
          </Descriptions.Item>
        )}
      </Descriptions>

      {payload.location && (
        <>
          <Divider>{t('auditLogsPage.sections.location')}</Divider>
          <Descriptions column={2} bordered>
            {payload.location.country && (
              <Descriptions.Item label={t('auditLogsPage.fields.country')}>
                {payload.location.country}
              </Descriptions.Item>
            )}
            {payload.location.region && (
              <Descriptions.Item label={t('auditLogsPage.fields.region')}>
                {payload.location.region}
              </Descriptions.Item>
            )}
            {payload.location.city && (
              <Descriptions.Item label={t('auditLogsPage.fields.city')}>
                {payload.location.city}
              </Descriptions.Item>
            )}
            {payload.location.coordinates && (
              <Descriptions.Item label={t('auditLogsPage.fields.coordinates')}>
                {payload.location.coordinates.join(', ')}
              </Descriptions.Item>
            )}
          </Descriptions>
        </>
      )}

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

      {!record.resolved && onResolve && (
        <>
          <Divider />
          <Button
            type="primary"
            danger
            onClick={handleResolve}
            loading={resolving}
          >
            {t('auditLogsPage.actions.resolve')}
          </Button>
        </>
      )}
    </>
  );
}
