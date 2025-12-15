import type { ProColumns } from '@ant-design/pro-components';
import {
  ProDescriptions,
  ProForm,
  ProFormDateTimePicker,
  ProFormDigit,
  ProFormList,
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
  Popconfirm,
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
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { AppAdminUserStatusSelect } from 'src/components/common/AppAdminUserStatusSelect';
import { AppPage } from 'src/components/common/AppPage';
import { SessionsTable } from 'src/features/admin/sessions/components/SessionsTable';
import { useAdminSessionsPagination } from 'src/features/admin/sessions/hooks/useAdminSessions';
import { useSessionDateRange } from 'src/features/admin/sessions/hooks/useSessionDateRange';
import { getSessionStatus } from 'src/features/admin/sessions/utils/sessionStatus';
import {
  useAdminUserDetail,
  useAdminUserMfaAction,
  useCreateAdminUser,
  useUpdateAdminUser,
  useUpdateAdminUserRoles,
} from 'src/features/admin/users/hooks/useAdminUsers';
import { useAdminRoles } from 'src/hooks/api/useAdminRoles';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import { useModal } from 'src/hooks/useModal';
import { useNotify } from 'src/hooks/useNotify';
import { toIsoStringOrNull } from 'src/lib/utils/date.utils';
import { adminSessionsService } from 'src/services/api/admin/sessions.service';
import type { AdminSession } from 'src/types/admin-sessions';
import {
  ADMIN_LOCKOUT_REASONS,
  type AdminLockoutReason,
  type AdminUserDetail as AdminUserDetailType,
  type AdminUserStatus,
} from '../types';

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

interface AdminUserUpdateRolesFormValues {
  roles: {
    roleId: string;
    expiresAt?: Dayjs | null;
  }[];
  reason: string;
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

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const notify = useNotify();
  const modal = useModal();

  const isCreateMode = !userId || userId === 'new';

  const initialTab = (searchParams.get('tab') || 'general') as
    | 'general'
    | 'security'
    | 'edit'
    | 'roles'
    | 'sessions';
  const [tabKey, setTabKey] = useState<
    'general' | 'security' | 'edit' | 'roles' | 'sessions'
  >(initialTab);

  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('USER.UPDATE');
  const canManageMfa = hasPermission('USER.RESET_MFA');

  const effectiveUserId = isCreateMode ? undefined : userId;
  const { data, isLoading } = useAdminUserDetail(
    effectiveUserId ?? undefined,
    !isCreateMode,
  );
  const updateMutation = useUpdateAdminUser({
    onSuccess: () => {
      notify.notification.success({
        title: t('common.messages.updateSuccess'),
      });
      navigate('/admin/users');
    },
  });

  const createMutation = useCreateAdminUser({
    onSuccess: ({ auditLogId }) => {
      notify.notification.success({
        title: t('common.messages.createSuccess'),
        description: t('adminUsersPage.create.auditLog', {
          auditId: auditLogId,
        }),
      });
      navigate('/admin/users');
    },
  });

  const updateRolesMutation = useUpdateAdminUserRoles({
    onSuccess: () => {
      notify.notification.success({
        title: t('common.messages.rolesUpdateSuccess'),
      });
      navigate('/admin/users');
    },
  });

  const { data: allRolesResponse, isLoading: isLoadingRoles } = useAdminRoles();

  const resetMfaMutation = useAdminUserMfaAction('reset', {
    onSuccess: ({ auditLogId }) => {
      notify.notification.success({
        title: t('common.messages.mfaResetSuccess'),
        description: t('adminUsersPage.create.auditLog', {
          auditId: auditLogId,
        }),
      });
    },
  });

  const disableMfaMutation = useAdminUserMfaAction('disable', {
    onSuccess: ({ auditLogId }) => {
      notify.notification.success({
        title: t('common.messages.mfaDisableSuccess'),
        description: t('adminUsersPage.create.auditLog', {
          auditId: auditLogId,
        }),
      });
    },
  });

  const initialValues = useMemo(() => {
    if (!data) {
      return undefined;
    }
    return mapDetailToFormValues(data);
  }, [data]);

  const initialRoleValues = useMemo(() => {
    if (!data) {
      return undefined;
    }
    return {
      roles: data.roles.map((roleRef) => ({
        roleId: roleRef.role.id,
        expiresAt: roleRef.expiresAt ? dayjs(roleRef.expiresAt) : null,
      })),
      reason: '',
    } satisfies AdminUserUpdateRolesFormValues;
  }, [data]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setTabKey(tab as typeof tabKey);
    }
  }, [searchParams]);

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

  const handleCreate = async (values: AdminUserUpdateFormValues) => {
    const payload = {
      email: (values as any).email as string,
      password: (values as any).password as string,
      roleIds: ((values as any).roleIds as string[] | undefined)?.filter(
        Boolean,
      ),
      name:
        typeof values.name === 'string' && values.name.trim().length > 0
          ? values.name
          : undefined,
      status: values.status,
      emailVerified: values.emailVerified,
    };

    await createMutation.mutateAsync(payload);
  };

  const handleUpdateRoles = async (values: AdminUserUpdateRolesFormValues) => {
    if (!userId) {
      return;
    }

    const payload = {
      roles: (values.roles ?? []).map((item) => {
        const expiresAtValue = item.expiresAt;
        return {
          roleId: item.roleId,
          expiresAt: expiresAtValue
            ? dayjs(expiresAtValue).toISOString()
            : null,
        };
      }),
      reason: values.reason.trim(),
    };

    await updateRolesMutation.mutateAsync({ userId, payload });
  };

  const promptMfaReason = (action: 'reset' | 'disable') => {
    if (!userId) {
      return;
    }

    let reasonValue = '';
    modal.confirm({
      title:
        action === 'reset'
          ? t('common.actions.resetMfa')
          : t('common.actions.disableMfa'),
      content: (
        <Input.TextArea
          autoFocus
          rows={3}
          placeholder={t('common.placeholders.auditReason')}
          onChange={(event) => {
            reasonValue = event.target.value;
          }}
        />
      ),
      okText:
        action === 'reset'
          ? t('common.actions.resetMfa')
          : t('common.actions.disableMfa'),
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

  const handleTabChange = (key: string) => {
    setTabKey(key as typeof tabKey);
    const targetUserId = userId ?? 'new';
    navigate(`/admin/users/${targetUserId}?tab=${key}`, { replace: true });
  };

  if (isCreateMode) {
    return (
      <AppPage
        title={t('adminUsersPage.create.title')}
        breadcrumb={{
          items: [
            {
              title: <Link to="/admin/users">{t('sidebar.adminUsers')}</Link>,
            },
            { title: t('adminUsersPage.create.title') },
          ],
        }}
      >
        <ProForm<AdminUserUpdateFormValues>
          layout="vertical"
          submitter={{
            searchConfig: {
              submitText: t('common.actions.create'),
            },
            submitButtonProps: {
              type: 'primary',
              loading: createMutation.isPending,
            },
            resetButtonProps: false,
          }}
          onFinish={async (values) => {
            await handleCreate(values);
            return true;
          }}
        >
          <ProFormText
            name="email"
            label={t('common.fields.email')}
            rules={[
              { required: true, message: t('common.fields.email') },
              { type: 'email' },
            ]}
          />
          <ProFormText.Password
            name="password"
            label={t('common.fields.password')}
            rules={[{ required: true }]}
          />
          <ProFormTextArea
            name="name"
            label={t('common.fields.displayName')}
            placeholder="Jane Doe"
          />
          <ProFormSelect
            name="roleIds"
            label={t('common.fields.roles')}
            mode="multiple"
            placeholder="admin"
            options={(allRolesResponse?.docs ?? []).map((role) => ({
              value: role.id,
              label: role.title,
            }))}
            fieldProps={{
              loading: isLoadingRoles,
              showSearch: true,
              optionFilterProp: 'label',
            }}
          />
          <ProFormSelect
            name="status"
            label={t('common.fields.status')}
            fieldProps={{
              showSearch: true,
              optionFilterProp: 'label',
            }}
            options={undefined}
          >
            <AppAdminUserStatusSelect
              style={{ width: '100%' }}
              placeholder={t('common.fields.status')}
            />
          </ProFormSelect>
          <ProFormSwitch
            name="emailVerified"
            label={t('common.fields.emailVerified')}
          />
        </ProForm>
      </AppPage>
    );
  }

  return (
    <AppPage
      title={t('adminUsersPage.update.title')}
      breadcrumb={{
        items: [
          {
            title: <Link to="/admin/users">{t('sidebar.adminUsers')}</Link>,
          },
          { title: data?.email ?? userId },
        ],
      }}
    >
      {isLoading && <Skeleton active paragraph={{ rows: 6 }} />}
      {!isLoading && !data && (
        <Alert type="warning" title={t('errors.itemNotFound')} showIcon />
      )}
      {!isLoading && data && (
        <Tabs
          activeKey={tabKey}
          onChange={handleTabChange}
          items={[
            {
              key: 'general',
              label: t('adminUsersPage.update.tabGeneral'),
              children: (
                <ProDescriptions column={1} bordered>
                  <ProDescriptions.Item label={t('common.fields.email')}>
                    {data.email}
                  </ProDescriptions.Item>
                  <ProDescriptions.Item label={t('common.fields.status')}>
                    {formatStatus(data.status)}
                  </ProDescriptions.Item>
                  <ProDescriptions.Item label={t('common.fields.displayName')}>
                    {data.name ?? '-'}
                  </ProDescriptions.Item>
                  <ProDescriptions.Item
                    label={t('common.fields.emailVerified')}
                  >
                    {data.emailVerified
                      ? t('common.enabled')
                      : t('common.disabled')}
                  </ProDescriptions.Item>
                  <ProDescriptions.Item label={t('common.fields.createdAt')}>
                    {dayjs(data.created).format('YYYY-MM-DD HH:mm')}
                  </ProDescriptions.Item>
                  <ProDescriptions.Item label={t('common.fields.updatedAt')}>
                    {dayjs(data.modified).format('YYYY-MM-DD HH:mm')}
                  </ProDescriptions.Item>
                  <ProDescriptions.Item label={t('common.fields.roles')}>
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
                      label={t('common.fields.lockoutUntil')}
                    >
                      {data.lockoutUntil
                        ? dayjs(data.lockoutUntil).format('YYYY-MM-DD HH:mm')
                        : '-'}
                    </ProDescriptions.Item>
                    <ProDescriptions.Item
                      label={t('common.fields.lockoutReason')}
                    >
                      {data.lockoutReason ?? '-'}
                    </ProDescriptions.Item>
                    <ProDescriptions.Item
                      label={t('common.fields.passwordAttempts')}
                    >
                      {data.passwordAttempt}
                    </ProDescriptions.Item>
                    <ProDescriptions.Item
                      label={t('common.fields.passwordExpiresAt')}
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
                            {t('common.actions.resetMfa')}
                          </Button>
                          <Button
                            danger
                            disabled={Boolean(data.protected)}
                            loading={disableMfaMutation.isPending}
                            onClick={() => promptMfaReason('disable')}
                          >
                            {t('common.actions.disableMfa')}
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
                            submitText: t('common.actions.saveChanges'),
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
                          label={t('common.fields.status')}
                          fieldProps={{
                            showSearch: true,
                            optionFilterProp: 'label',
                          }}
                          options={undefined}
                          rules={[{ required: true }]}
                        >
                          <AppAdminUserStatusSelect
                            style={{ width: '100%' }}
                            placeholder={t('common.fields.status')}
                          />
                        </ProFormSelect>
                        <ProFormText
                          name="name"
                          label={t('common.fields.displayName')}
                          placeholder="Jane Doe"
                        />
                        <ProFormSwitch
                          name="emailVerified"
                          label={t('common.fields.emailVerified')}
                        />
                        <ProFormDateTimePicker
                          name="lockoutUntil"
                          label={t('common.fields.lockoutUntil')}
                        />
                        <ProFormSelect
                          name="lockoutReason"
                          label={t('common.fields.lockoutReason')}
                          allowClear
                          options={ADMIN_LOCKOUT_REASONS.map((reason) => ({
                            value: reason,
                            label: reason.replace(/_/g, ' ').toUpperCase(),
                          }))}
                        />
                        <ProFormDigit
                          name="passwordAttempt"
                          label={t('common.fields.passwordAttempts')}
                          min={0}
                        />
                        <ProFormDateTimePicker
                          name="passwordExpired"
                          label={t('common.fields.passwordExpiresAt')}
                        />
                        <ProFormTextArea
                          name="reason"
                          label={t('common.fields.reason')}
                          placeholder="Audit note"
                        />
                      </ProForm>
                    ),
                  },
                  {
                    key: 'roles',
                    label: t('adminUsersPage.update.tabRoles'),
                    children: (
                      <ProForm<AdminUserUpdateRolesFormValues>
                        layout="vertical"
                        initialValues={initialRoleValues}
                        submitter={{
                          searchConfig: {
                            submitText: t('common.actions.saveChanges'),
                          },
                          submitButtonProps: {
                            type: 'primary',
                            loading: updateRolesMutation.isPending,
                          },
                          resetButtonProps: false,
                        }}
                        onFinish={async (values) => {
                          await handleUpdateRoles(values);
                          return true;
                        }}
                      >
                        <ProFormList
                          name="roles"
                          label={t('common.fields.roles')}
                          creatorButtonProps={{
                            position: 'bottom',
                          }}
                          copyIconProps={false}
                        >
                          {() => (
                            <Space
                              align="baseline"
                              style={{ display: 'flex', gap: 16 }}
                            >
                              <ProFormSelect
                                name="roleId"
                                label={t('common.fields.roles')}
                                rules={[
                                  {
                                    required: true,
                                    message: t(
                                      'adminUsersPage.form.rolesRequired',
                                    ),
                                  },
                                ]}
                                fieldProps={{
                                  loading: isLoadingRoles,
                                  showSearch: true,
                                  optionFilterProp: 'label',
                                  options: (allRolesResponse?.docs ?? []).map(
                                    (role) => ({
                                      value: role.id,
                                      label: role.title,
                                    }),
                                  ),
                                  placeholder: t(
                                    'common.placeholders.selectRoles',
                                  ),
                                }}
                              />
                              <ProFormDateTimePicker
                                name="expiresAt"
                                label={t('common.fields.roleExpiry')}
                                fieldProps={{
                                  showTime: true,
                                }}
                              />
                            </Space>
                          )}
                        </ProFormList>
                        <ProFormTextArea
                          name="reason"
                          label={t('common.fields.reason')}
                          placeholder="Audit note"
                          rules={[
                            {
                              required: true,
                              message: t('adminUsersPage.form.reasonRequired'),
                            },
                          ]}
                        />
                      </ProForm>
                    ),
                  },
                ]
              : []),
            {
              key: 'sessions',
              label: t('adminUsersPage.update.tabSessions'),
              children: <UserSessionsTab userId={userId} />,
            },
          ]}
        />
      )}
    </AppPage>
  );
}

function UserSessionsTab({ userId }: { userId?: string }) {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const canRevokeAll = hasPermission('SESSION.REVOKE_ALL');
  const canRevokeSelf = hasPermission('SESSION.REVOKE');

  const { dateRange, setDateRange, created0, created1, resetDateRange } =
    useSessionDateRange(30);

  const listParams = useMemo(
    () => ({
      take: 20,
      created0,
      created1,
      userIds: userId ? [userId] : undefined,
    }),
    [created0, created1, userId],
  );

  const {
    sessions,
    statusById,
    pagination,
    isLoading,
    isInitialLoading,
    reload,
    goToPage,
    changePageSize,
  } = useAdminSessionsPagination({
    initialParams: listParams,
    pageSize: 20,
    autoLoad: true,
  });

  const handleRevoke = async (session: AdminSession) => {
    await adminSessionsService.revoke([session.id]);
    await reload();
  };

  const handlePageChange = async (page: number, pageSize?: number) => {
    if (pageSize && pageSize !== pagination.pageSize) {
      await changePageSize(pageSize);
    } else {
      await goToPage(page);
    }
  };

  const columns: ProColumns<AdminSession>[] = [
    {
      title: t('common.fields.actions'),
      dataIndex: 'actions',
      hideInSearch: true,
      render: (_, record) => {
        const status = getSessionStatus(record, statusById);
        if (status !== 'active') {
          return '-';
        }

        const canRevokeThis = canRevokeAll || canRevokeSelf;

        if (!canRevokeThis) {
          return '-';
        }

        return (
          <Popconfirm
            title={t('adminSessionsPage.dialogs.revokeConfirmTitle')}
            description={t('adminSessionsPage.dialogs.revokeConfirm')}
            onConfirm={() => handleRevoke(record)}
          >
            <Button size="small" danger type="link">
              {t('common.actions.revoke')}
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  if (!userId) {
    return null;
  }

  return (
    <SessionsTable
      sessions={sessions}
      statusById={statusById}
      loading={isLoading || isInitialLoading}
      pagination={pagination}
      onPageChange={handlePageChange}
      columns={columns}
      extendBaseColumns
      formInitialValues={{
        created: dateRange,
      }}
      onSubmit={(values) => {
        const range = values.created as [dayjs.Dayjs, dayjs.Dayjs] | undefined;
        if (range && range.length === 2) {
          setDateRange([range[0]!, range[1]!]);
        }
      }}
      onReset={resetDateRange}
    />
  );
}
