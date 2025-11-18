import { usePermission } from '@client/hooks/usePermission';
import { formatDate } from '@client/utils/format';
import { ActionIcon, Badge, Button } from '@mantine/core';
import type { SessionResponseWithUser } from '@server/dto/admin/session.dto';
import { IconBan } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from './DataTable';

type SessionTableProps = {
  sessions: SessionResponseWithUser[];
  onRevoke: (session: SessionResponseWithUser) => void;
  onRevokeMany?: (sessionIds: string[]) => void;
  isLoading?: boolean;
  showIndexColumn?: boolean;
  recordsPerPage?: number;
  recordsPerPageOptions?: number[];
  onRecordsPerPageChange?: (size: number) => void;
  page?: number;
  onPageChange?: (page: number) => void;
  totalRecords?: number;
  sorting?: { id: string; desc: boolean }[];
  onSortingChange?: (
    updater:
      | { id: string; desc: boolean }[]
      | ((prev: { id: string; desc: boolean }[]) => {
          id: string;
          desc: boolean;
        }[]),
  ) => void;
  showUserColumn?: boolean;
};

const SessionTable = ({
  sessions,
  onRevoke,
  onRevokeMany,
  isLoading = false,
  showIndexColumn = true,
  recordsPerPage,
  recordsPerPageOptions,
  onRecordsPerPageChange,
  page,
  onPageChange,
  totalRecords,
  sorting,
  onSortingChange,
  showUserColumn = false,
}: SessionTableProps) => {
  const { t } = useTranslation();
  const { hasPermission } = usePermission();
  const [selectedRecords, setSelectedRecords] = useState<
    SessionResponseWithUser[]
  >([]);

  const canRevoke =
    hasPermission('SESSION.REVOKE') || hasPermission('SESSION.REVOKE_ALL');

  const getSessionStatus = (session: SessionResponseWithUser) => {
    const now = new Date();
    const expired = new Date(session.expired);

    if (session.revoked) {
      return { label: 'Revoked', color: 'red' };
    }
    if (expired < now) {
      return { label: 'Expired', color: 'gray' };
    }
    return { label: 'Active', color: 'green' };
  };

  const columns = useMemo((): DataTableColumn<SessionResponseWithUser>[] => {
    const cols: DataTableColumn<SessionResponseWithUser>[] = [];

    if (showUserColumn) {
      cols.push({
        accessor: 'user.username',
        title: 'sessions.user',
        render: (_value, row: SessionResponseWithUser) => {
          if (!row.user) {
            return <span className="text-gray-400">-</span>;
          }
          return (
            <div>
              <div className="font-medium">{row.user.username}</div>
              {row.user.name && (
                <div className="text-sm text-gray-500">{row.user.name}</div>
              )}
            </div>
          );
        },
        enableSorting: false,
        enableGrouping: false,
      });
    }

    cols.push(
      {
        accessor: 'device',
        title: 'sessions.device',
        render: (value) => {
          if (!value) return <span className="text-gray-400">-</span>;
          return <span>{value as string}</span>;
        },
        enableSorting: false,
      },
      {
        accessor: 'ip',
        title: 'sessions.ip',
        render: (value) => {
          if (!value) return <span className="text-gray-400">-</span>;
          return <span>{value as string}</span>;
        },
        enableSorting: false,
      },
      {
        accessor: 'status',
        title: 'sessions.statusLabel',
        render: (value, row: SessionResponseWithUser) => {
          const status = getSessionStatus(row);
          return (
            <Badge color={status.color} variant="light">
              {t(`sessions.status.${status.label.toLowerCase()}`, {
                defaultValue: status.label,
              })}
            </Badge>
          );
        },
        enableSorting: false,
      },
      {
        accessor: 'created',
        title: 'sessions.created',
        render: (value) => {
          if (!value) return <span className="text-gray-400">-</span>;
          return <span>{formatDate(value as string | Date)}</span>;
        },
      },
      {
        accessor: 'expired',
        title: 'sessions.expired',
        render: (value) => {
          if (!value) return <span className="text-gray-400">-</span>;
          return <span>{formatDate(value as string | Date)}</span>;
        },
      },
    );

    if (canRevoke) {
      cols.push({
        title: 'sessions.actions',
        textAlign: 'center',
        width: '8rem',
        render: (value, row: SessionResponseWithUser) => {
          const status = getSessionStatus(row);
          const isDisabled =
            status.label === 'Revoked' || status.label === 'Expired';

          return (
            <div className="flex items-center justify-center gap-2">
              <ActionIcon
                variant="subtle"
                color="red"
                disabled={isDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDisabled) {
                    onRevoke(row);
                  }
                }}
              >
                <IconBan size={16} />
              </ActionIcon>
            </div>
          );
        },
      });
    }

    return cols;
  }, [t, onRevoke, canRevoke, showUserColumn]);

  const selectedCount = selectedRecords?.length || 0;

  return (
    <DataTable
      data={sessions}
      columns={columns}
      loading={isLoading}
      enableRowNumbers={showIndexColumn}
      recordsPerPage={recordsPerPage}
      recordsPerPageOptions={recordsPerPageOptions}
      onRecordsPerPageChange={onRecordsPerPageChange}
      page={page}
      onPageChange={onPageChange}
      totalRecords={totalRecords}
      sorting={sorting}
      onSortingChange={onSortingChange}
      selectedRecords={selectedRecords}
      onSelectedRecordsChange={setSelectedRecords}
      renderTopToolbarCustomActions={
        onRevokeMany && selectedCount > 0
          ? () => (
              <Button
                color="red"
                variant="filled"
                leftSection={<IconBan size={16} />}
                onClick={() => {
                  const selectedIds = selectedRecords?.map((r) => r.id) || [];
                  if (selectedIds.length > 0 && onRevokeMany) {
                    onRevokeMany(selectedIds);
                  }
                }}
                disabled={isLoading}
              >
                {t('sessions.revokeSelected', {
                  defaultValue: `Revoke ${selectedCount}`,
                  count: selectedCount,
                })}
              </Button>
            )
          : undefined
      }
    />
  );
};

export default SessionTable;
