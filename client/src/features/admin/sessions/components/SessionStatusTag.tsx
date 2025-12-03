import { Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import type { AdminSessionStatus } from 'src/types/admin-sessions';

interface SessionStatusTagProps {
  status: AdminSessionStatus;
}

export function SessionStatusTag({ status }: SessionStatusTagProps) {
  const { t } = useTranslation();

  if (status === 'revoked') {
    return <Tag color="default">{t('adminSessionsPage.status.revoked')}</Tag>;
  }

  if (status === 'expired') {
    return <Tag color="default">{t('adminSessionsPage.status.expired')}</Tag>;
  }

  return <Tag color="green">{t('adminSessionsPage.status.active')}</Tag>;
}
