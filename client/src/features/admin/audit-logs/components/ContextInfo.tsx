import { Descriptions, Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { AdminAuditLog } from 'src/types/admin-audit-logs';

interface ContextInfoProps {
  record: AdminAuditLog;
}

export function ContextInfo({ record }: ContextInfoProps) {
  const { t } = useTranslation();

  return (
    <Descriptions column={2} bordered size="small">
      {record.userId && (
        <Descriptions.Item label={t('common.fields.userId')}>
          <Typography.Text code copyable>
            {record.userId}
          </Typography.Text>
        </Descriptions.Item>
      )}
      {record.subjectUserId && (
        <Descriptions.Item label={t('auditLogsPage.fields.subjectUserId')}>
          <Typography.Text code copyable>
            {record.subjectUserId}
          </Typography.Text>
        </Descriptions.Item>
      )}
      {record.sessionId && (
        <Descriptions.Item label={t('common.fields.sessionId')}>
          <Typography.Text code copyable>
            {record.sessionId}
          </Typography.Text>
        </Descriptions.Item>
      )}
      {record.ip && (
        <Descriptions.Item label={t('common.fields.ip')}>
          <Typography.Text code copyable>
            {record.ip}
          </Typography.Text>
        </Descriptions.Item>
      )}
      {record.userAgent && (
        <Descriptions.Item label={t('auditLogsPage.fields.userAgent')}>
          <Typography.Text ellipsis style={{ maxWidth: 400 }}>
            {record.userAgent}
          </Typography.Text>
        </Descriptions.Item>
      )}
      {record.traceId && (
        <Descriptions.Item label={t('common.fields.traceId')}>
          <Typography.Text code copyable>
            {record.traceId}
          </Typography.Text>
        </Descriptions.Item>
      )}
      {record.correlationId && (
        <Descriptions.Item label={t('common.fields.correlationId')}>
          <Typography.Text code copyable>
            {record.correlationId}
          </Typography.Text>
        </Descriptions.Item>
      )}
      {record.requestId && (
        <Descriptions.Item label={t('auditLogsPage.fields.requestId')}>
          <Typography.Text code copyable>
            {record.requestId}
          </Typography.Text>
        </Descriptions.Item>
      )}
      <Descriptions.Item label={t('auditLogsPage.fields.occurredAt')}>
        {dayjs(record.occurredAt).format('YYYY-MM-DD HH:mm:ss')}
      </Descriptions.Item>
      <Descriptions.Item label={t('common.fields.createdAt')}>
        {dayjs(record.created).format('YYYY-MM-DD HH:mm:ss')}
      </Descriptions.Item>
    </Descriptions>
  );
}
