import {
  ProDescriptions,
  ProForm,
  ProFormDateTimePicker,
  ProFormDigit,
  type ProFormInstance,
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
  Modal,
  Skeleton,
  Space,
  Tabs,
  Tag,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppDrawer } from 'src/components/common/AppDrawer';
import {
  useAdminUserDetail,
  useAdminUserMfaAction,
  useUpdateAdminUser,
} from 'src/features/admin/users/hooks/useAdminUsers';
import { useAdminRoles } from 'src/hooks/api/useAdminRoles';
import { useNotify } from 'src/hooks/useNotify';
import {
  ADMIN_LOCKOUT_REASONS,
  ADMIN_USER_STATUSES,
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
  roleIds?: string[];
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
    roleIds: detail.roles.map((role) => role.roleId),
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

export function AdminUserDetailDrawer({
  userId,
  open,
  onClose,
  canUpdate,
  canManageMfa,
  onActionCompleted,
  initialTab = 'general',
}: AdminUserDetailDrawerProps) {
  const formRef = useRef<ProFormInstance<AdminUserUpdateFormValues> | null>(
    null,
  );
  const [tabKey, setTabKey] = useState<'general' | 'security' | 'edit'>(
    initialTab,
  );
  const { t } = useTranslation();
  const notify = useNotify();
  const { data: roles, isLoading: isLoadingRoles } = useAdminRoles();

  const { data, isLoading } = useAdminUserDetail(userId ?? undefined, open);
  const updateMutation = useUpdateAdminUser({
    onSuccess: () => {
      notify.notification.success({
        title: t('adminUsersPage.update.success'),
        message: t('adminUsersPage.update.success'),
      });
      onActionCompleted?.();
    },
  });

  const resetMfaMutation = useAdminUserMfaAction('reset', {
    onSuccess: ({ auditLogId }) => {
      notify.notification.success({
        title: t('adminUsersPage.update.mfaResetSuccess'),
        message: t('adminUsersPage.update.mfaResetSuccess'),
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
        message: t('adminUsersPage.update.mfaDisableSuccess'),
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
    if (initialValues && formRef.current) {
      formRef.current.setFieldsValue(initialValues);
    }
  }, [initialValues]);

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
      lockoutUntil: values.lockoutUntil
        ? values.lockoutUntil.toISOString()
        : null,
      lockoutReason: values.lockoutReason ?? null,
      passwordExpired: values.passwordExpired
        ? values.passwordExpired.toISOString()
        : null,
    };
    await updateMutation.mutateAsync({ userId, payload });
  };

  const promptMfaReason = (action: 'reset' | 'disable') => {
    if (!userId) {
      return;
    }

    let reasonValue = '';
    Modal.confirm({
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
      width={800}
    >
      {isLoading && <Skeleton active paragraph={{ rows: 6 }} />}
      {!isLoading && !data && (
        <Alert type="warning" message={t('errors.itemNotFound')} showIcon />
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
                    label={t('adminUsersPage.detail.baseCurrency')}
                  >
                    {data.baseCurrencyId}
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
                      {data.roles.map((role) => (
                        <Tag key={role.roleId}>{role.roleId}</Tag>
                      ))}
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
                      message={t('adminUsersPage.update.tabSecurity')}
                      action={
                        <Space>
                          <Button
                            danger
                            loading={resetMfaMutation.isPending}
                            onClick={() => promptMfaReason('reset')}
                          >
                            {t('adminUsersPage.actions.resetMfa')}
                          </Button>
                          <Button
                            danger
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
            ...(canUpdate
              ? [
                  {
                    key: 'edit',
                    label: t('adminUsersPage.update.tabEdit'),
                    children: (
                      <ProForm<AdminUserUpdateFormValues>
                        layout="vertical"
                        formRef={formRef}
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
                          options={ADMIN_USER_STATUSES.map((status) => ({
                            value: status,
                            label: formatStatus(status),
                          }))}
                          rules={[{ required: true }]}
                        />
                        <ProFormText
                          name="name"
                          label={t('adminUsersPage.form.name')}
                          placeholder="Jane Doe"
                        />
                        <ProFormSelect
                          name="roleIds"
                          label={t('adminUsersPage.form.roles')}
                          mode="multiple"
                          placeholder="admin"
                          options={
                            roles?.map((role) => ({
                              value: role.id,
                              label: role.title,
                            })) ?? []
                          }
                          fieldProps={{
                            loading: isLoadingRoles,
                            showSearch: true,
                            optionFilterProp: 'label',
                          }}
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
