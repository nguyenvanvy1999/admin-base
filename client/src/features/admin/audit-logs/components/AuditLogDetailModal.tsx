import { useTranslation } from 'react-i18next';
import { AppModal } from 'src/components/common/AppModal';
import type { AdminAuditLog } from 'src/types/admin-audit-logs';
import { CudDetailView } from './CudDetailView';
import { InternalDetailView } from './InternalDetailView';
import { SecurityDetailView } from './SecurityDetailView';

interface AuditLogDetailModalProps {
  open: boolean;
  record: AdminAuditLog | null;
  onClose: () => void;
  onResolve?: (id: string) => Promise<void>;
}

export function AuditLogDetailModal({
  open,
  record,
  onClose,
  onResolve,
}: AuditLogDetailModalProps) {
  const { t } = useTranslation();

  if (!record) return null;

  const getTitle = () => {
    if (record.category === 'cud') {
      return t('auditLogsPage.modal.title.cud');
    }
    if (record.category === 'security') {
      return t('auditLogsPage.modal.title.security');
    }
    return t('auditLogsPage.modal.title.internal');
  };

  const renderDetailView = () => {
    if (record.category === 'cud') {
      return <CudDetailView record={record} />;
    }
    if (record.category === 'security') {
      return <SecurityDetailView record={record} onResolve={onResolve} />;
    }
    return <InternalDetailView record={record} />;
  };

  return (
    <AppModal
      open={open}
      onCancel={onClose}
      title={getTitle()}
      width={800}
      footer={null}
      destroyOnClose
    >
      {renderDetailView()}
    </AppModal>
  );
}
