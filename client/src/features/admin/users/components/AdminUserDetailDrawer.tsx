import {
  ProDescriptions,
  ProForm,
  ProFormDateTimePicker,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Flex,
  Input,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppAdminUserStatusSelect } from 'src/components/common/AppAdminUserStatusSelect';
import { AppDrawer } from 'src/components/common/AppDrawer';
import {
  useAdminUserDetail,
  useAdminUserMfaAction,
  useUpdateAdminUser,
} from 'src/features/admin/users/hooks/useAdminUsers';
import { useModal } from 'src/hooks/useModal';
import { useNotify } from 'src/hooks/useNotify';
import { toIsoStringOrNull } from 'src/lib/utils/date.utils';
import {
  ADMIN_LOCKOUT_REASONS,
  type AdminLockoutReason,
  type AdminUserDetail as AdminUserDetailType,
  type AdminUserStatus,
} from 'src/types/admin-users';

interface AdminUserDetailDrawerProps {
  userId?: string | null;
  open: boolean;
  onClose: () => void;
  canUpdate: boolean;
  canManageMfa: boolean;
  onActionCompleted?: () => void;
  initialTab?: 'general' | 'security' | 'edit';
}

interface AdminUserUpdateFormValues {
  status?: AdminUserStatus;
  name?: string | null;
  lockoutUntil?: Dayjs | null;
  lockoutReason?: AdminLockoutReason | null;
  emailVerified?: boolean;
  passwordAttempt?: number;
  passwordExpired?: Dayjs | null;
  reason?: string;
}

function formatStatus(status: AdminUserStatus): string {
  return status.toUpperCase();
}

function mapDetailToFormValues(
  detail: AdminUserDetailType,
): AdminUserUpdateFormValues {
  return {
    status: detail.status,
    name: detail.name,
    lockoutUntil: detail.lockoutUntil ? dayjs(detail.lockoutUntil) : null,
    lockoutReason: detail.lockoutReason,
    emailVerified: detail.emailVerified,
    passwordAttempt: detail.passwordAttempt,
    passwordExpired: detail.passwordExpired
      ? dayjs(detail.passwordExpired)
      : null,
    reason: undefined,
  };
}

function getRoleExpiryMeta(expiresAt: string | null) {
  if (!expiresAt) {
    return {
      status: 'no-expiry' as const,
      color: 'default' as const,
      isExpired: false,
      isSoon: false,
      date: null as dayjs.Dayjs | null,
    };
  }
  const expiryDate = dayjs(expiresAt);
  const now = dayjs();
  const isExpired = expiryDate.isBefore(now);
  const isSoon = !isExpired && expiryDate.diff(now, 'day') < 7;

  if (isExpired) {
    return {
      status: 'expired' as const,
      color: 'default' as const,
      isExpired: true,
      isSoon: false,
      date: expiryDate,
    };
  }

  if (isSoon) {
    return {
      status: 'soon' as const,
      color: 'orange' as const,
      isExpired: false,
      isSoon: true,
      date: expiryDate,
    };
  }

  return {
    status: 'active' as const,
    color: 'green' as const,
    isExpired: false,
    isSoon: false,
    date: expiryDate,
  };
}

export function AdminUserDetailDrawer({
  userId,
  open,
  onClose,
  canUpdate,
  canManageMfa,
  onActionCompleted,
  initialTab = 'general',
}: AdminUserDetailDrawerProps) {
  const [tabKey, setTabKey] = useState<'general' | 'security' | 'edit'>(
    initialTab,
  );
  const { t } = useTranslation();
  const notify = useNotify();
  const modal = useModal();

  const { data, isLoading } = useAdminUserDetail(userId ?? undefined, open);
  const updateMutation = useUpdateAdminUser({
    onSuccess: () => {
      onClose();
      notify.notification.success({
        title: t('adminUsersPage.update.success'),
      });
      onActionCompleted?.();
    },
  });

  const resetMfaMutation = useAdminUserMfaAction('reset', {
    onSuccess: ({ auditLogId }) => {
      notify.notification.success({
        title: t('adminUsersPage.update.mfaResetSuccess'),
        description: t('adminUsersPage.create.auditLog', {
          auditId: auditLogId,
        }),
      });
      onActionCompleted?.();
    },
  });

  const disableMfaMutation = useAdminUserMfaAction('disable', {
    onSuccess: ({ auditLogId }) => {
      notify.notification.success({
        title: t('adminUsersPage.update.mfaDisableSuccess'),
        description: t('adminUsersPage.create.auditLog', {
          auditId: auditLogId,
        }),
      });
      onActionCompleted?.();
    },
  });

  const initialValues = useMemo(() => {
    if (!data) {
      return undefined;
    }
    return mapDetailToFormValues(data);
  }, [data]);

  useEffect(() => {
    if (open) {
      setTabKey(initialTab);
    }
  }, [initialTab, open]);

  const handleUpdate = async (values: AdminUserUpdateFormValues) => {
    if (!userId) {
      return;
    }

    const payload = {
      ...values,
      name: values.name ?? null,
      lockoutUntil: toIsoStringOrNull(values.lockoutUntil),
      lockoutReason: values.lockoutReason ?? null,
      passwordExpired: toIsoStringOrNull(values.passwordExpired),
    };
    await updateMutation.mutateAsync({ userId, payload });
  };

  const promptMfaReason = (action: 'reset' | 'disable') => {
    if (!userId) {
      return;
    }

    let reasonValue = '';
    modal.confirm({
      title:
        action === 'reset'
          ? t('adminUsersPage.actions.resetMfa')
          : t('adminUsersPage.actions.disableMfa'),
      content: (
        <Input.TextArea
          autoFocus
          rows={3}
          placeholder={t('adminUsersPage.form.mfaReasonPlaceholder')}
          onChange={(event) => {
            reasonValue = event.target.value;
          }}
        />
      ),
      okText:
        action === 'reset'
          ? t('adminUsersPage.actions.resetMfa')
          : t('adminUsersPage.actions.disableMfa'),
      cancelText: t('common.cancel') ?? 'Hủy',
      onOk: () => {
        const payload = { reason: reasonValue || undefined };
        if (action === 'reset') {
          return resetMfaMutation.mutateAsync({ userId, payload });
        }
        return disableMfaMutation.mutateAsync({ userId, payload });
      },
    });
  };

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={t('adminUsersPage.update.title')}
      size={800}
    >
      {isLoading && <Skeleton active paragraph={{ rows: 6 }} />}
      {!isLoading && !data && (
        <Alert type="warning" title={t('errors.itemNotFound')} showIcon />
      )}
      {!isLoading && data && (
        <Tabs
          activeKey={tabKey}
          onChange={(key) => setTabKey(key as typeof tabKey)}
          items={[
            {
              key: 'general',
              label: t('adminUsersPage.update.tabGeneral'),
              children: (
                <ProDescriptions column={1} bordered>
                  <ProDescriptions.Item
                    label={t('adminUsersPage.detail.email')}
                  >
                    {data.email}
                  </ProDescriptions.Item>
                  <ProDescriptions.Item
                    label={t('adminUsersPage.detail.status')}
                  >
                    {formatStatus(data.status)}
                  </ProDescriptions.Item>
                  <ProDescriptions.Item label={t('adminUsersPage.detail.name')}>
                    {data.name ?? '-'}
                  </ProDescriptions.Item>
                  <ProDescriptions.Item
                    label={t('adminUsersPage.detail.emailVerified')}
                  >
                    {data.emailVerified
                      ? t('common.enabled')
                      : t('common.disabled')}
                  </ProDescriptions.Item>
                  <ProDescriptions.Item
                    label={t('adminUsersPage.detail.created')}
                  >
                    {dayjs(data.created).format('YYYY-MM-DD HH:mm')}
                  </ProDescriptions.Item>
                  <ProDescriptions.Item
                    label={t('adminUsersPage.detail.modified')}
                  >
                    {dayjs(data.modified).format('YYYY-MM-DD HH:mm')}
                  </ProDescriptions.Item>
                  <ProDescriptions.Item label={t('adminUsersPage.table.roles')}>
                    <Space wrap>
                      {data.roles.map((roleRef) => {
                        const meta = getRoleExpiryMeta(roleRef.expiresAt);
                        const baseLabel = roleRef.role.title || roleRef.role.id;
                        let statusLabel = t(
                          'adminUsersPage.roleExpiry.noExpiry',
                        );

                        if (meta.status === 'active' && meta.date) {
                          statusLabel = t(
                            'adminUsersPage.roleExpiry.activeUntil',
                            {
                              date: meta.date.format('DD/MM/YYYY'),
                            },
                          );
                        } else if (meta.status === 'soon' && meta.date) {
                          statusLabel = t(
                            'adminUsersPage.roleExpiry.soonExpire',
                            {
                              date: meta.date.format('DD/MM/YYYY'),
                            },
                          );
                        } else if (meta.status === 'expired' && meta.date) {
                          statusLabel = t(
                            'adminUsersPage.roleExpiry.expiredAt',
                            {
                              date: meta.date.format('DD/MM/YYYY'),
                            },
                          );
                        }

                        return (
                          <Tooltip
                            key={roleRef.role.id}
                            title={
                              <>
                                <div>
                                  {t('adminUsersPage.roleExpiry.tooltipRole')}:{' '}
                                  {baseLabel}
                                </div>
                                <div>
                                  {t('adminUsersPage.roleExpiry.tooltipStatus')}
                                  : {statusLabel}
                                </div>
                                <div>
                                  {t('adminUsersPage.roleExpiry.tooltipExpiry')}
                                  :{' '}
                                  {roleRef.expiresAt
                                    ? (meta.date?.format('DD/MM/YYYY HH:mm') ??
                                      '-')
                                    : t('adminUsersPage.roleExpiry.noExpiry')}
                                </div>
                              </>
                            }
                          >
                            <Tag
                              color={meta.color}
                              style={
                                meta.status === 'expired'
                                  ? { textDecoration: 'line-through' }
                                  : undefined
                              }
                            >
                              {baseLabel}
                            </Tag>
                          </Tooltip>
                        );
                      })}
                    </Space>
                  </ProDescriptions.Item>
                </ProDescriptions>
              ),
            },
            {
              key: 'security',
              label: t('adminUsersPage.update.tabSecurity'),
              children: (
                <Flex vertical gap={16}>
                  <ProDescriptions column={1} bordered>
                    <ProDescriptions.Item
                      label={t('adminUsersPage.detail.lockoutUntil')}
                    >
                      {data.lockoutUntil
                        ? dayjs(data.lockoutUntil).format('YYYY-MM-DD HH:mm')
                        : '-'}
                    </ProDescriptions.Item>
                    <ProDescriptions.Item
                      label={t('adminUsersPage.detail.lockoutReason')}
                    >
                      {data.lockoutReason ?? '-'}
                    </ProDescriptions.Item>
                    <ProDescriptions.Item
                      label={t('adminUsersPage.detail.passwordAttempt')}
                    >
                      {data.passwordAttempt}
                    </ProDescriptions.Item>
                    <ProDescriptions.Item
                      label={t('adminUsersPage.detail.passwordExpired')}
                    >
                      {data.passwordExpired
                        ? dayjs(data.passwordExpired).format('YYYY-MM-DD HH:mm')
                        : '-'}
                    </ProDescriptions.Item>
                  </ProDescriptions>
                  {canManageMfa && (
                    <Alert
                      type="info"
                      showIcon
                      title={t('adminUsersPage.update.tabSecurity')}
                      action={
                        <Space>
                          <Button
                            danger
                            disabled={Boolean(data.protected)}
                            loading={resetMfaMutation.isPending}
                            onClick={() => promptMfaReason('reset')}
                          >
                            {t('adminUsersPage.actions.resetMfa')}
                          </Button>
                          <Button
                            danger
                            disabled={Boolean(data.protected)}
                            loading={disableMfaMutation.isPending}
                            onClick={() => promptMfaReason('disable')}
                          >
                            {t('adminUsersPage.actions.disableMfa')}
                          </Button>
                        </Space>
                      }
                    />
                  )}
                </Flex>
              ),
            },
            ...(canUpdate && data && !data.protected
              ? [
                  {
                    key: 'edit',
                    label: t('adminUsersPage.update.tabEdit'),
                    children: (
                      <ProForm<AdminUserUpdateFormValues>
                        layout="vertical"
                        initialValues={initialValues}
                        submitter={{
                          searchConfig: {
                            submitText: t('adminUsersPage.actions.submit'),
                          },
                          submitButtonProps: {
                            type: 'primary',
                            loading: updateMutation.isPending,
                          },
                          resetButtonProps: false,
                        }}
                        onFinish={async (values) => {
                          await handleUpdate(values);
                          return true;
                        }}
                      >
                        <ProFormSelect
                          name="status"
                          label={t('adminUsersPage.form.status')}
                          fieldProps={{
                            showSearch: true,
                            optionFilterProp: 'label',
                          }}
                          options={undefined}
                          rules={[{ required: true }]}
                        >
                          <AppAdminUserStatusSelect
                            style={{ width: '100%' }}
                            placeholder={t('adminUsersPage.form.status')}
                          />
                        </ProFormSelect>
                        <ProFormText
                          name="name"
                          label={t('adminUsersPage.form.name')}
                          placeholder="Jane Doe"
                        />
                        <ProFormSwitch
                          name="emailVerified"
                          label={t('adminUsersPage.form.emailVerified')}
                        />
                        <ProFormDateTimePicker
                          name="lockoutUntil"
                          label={t('adminUsersPage.form.lockoutUntil')}
                        />
                        <ProFormSelect
                          name="lockoutReason"
                          label={t('adminUsersPage.form.lockoutReason')}
                          allowClear
                          options={ADMIN_LOCKOUT_REASONS.map((reason) => ({
                            value: reason,
                            label: reason.replace(/_/g, ' ').toUpperCase(),
                          }))}
                        />
                        <ProFormDigit
                          name="passwordAttempt"
                          label={t('adminUsersPage.form.passwordAttempt')}
                          min={0}
                        />
                        <ProFormDateTimePicker
                          name="passwordExpired"
                          label={t('adminUsersPage.form.passwordExpired')}
                        />
                        <ProFormTextArea
                          name="reason"
                          label={t('adminUsersPage.form.reason')}
                          placeholder="Audit note"
                        />
                      </ProForm>
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}
    </AppDrawer>
  );
}
