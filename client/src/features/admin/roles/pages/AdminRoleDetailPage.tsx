import type { ProColumns, ProFormInstance } from '@ant-design/pro-components';
import {
  ProDescriptions,
  ProForm,
  ProFormDateTimePicker,
  ProFormList,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import {
  Alert,
  App,
  Button,
  Card,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import dayjs from 'dayjs';
import type { TFunction } from 'i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { AppPage } from 'src/components/common/AppPage';
import { useAdminPermissions } from 'src/hooks/api/useAdminPermissions';
import { useAdminRoleDetail, useUpsertRole } from 'src/hooks/api/useAdminRoles';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import { adminUsersService } from 'src/services/api/admin/users.service';
import type {
  AdminRole,
  RolePlayerDetail,
  UpsertRoleDto,
} from 'src/types/admin';

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

type RoleFormValues = {
  title: string;
  description?: string | null;
  enabled: boolean;
  permissionIds: string[];
  players: {
    playerId: string;
    expiresAt: dayjs.Dayjs | null;
  }[];
};

type RoleGeneralFormSectionProps = {
  t: TFunction;
};

function RoleGeneralFormSection({ t }: RoleGeneralFormSectionProps) {
  return (
    <>
      <ProFormText
        name="title"
        label={t('common.fields.roleName')}
        rules={[
          {
            required: true,
            message: t('adminRolesPage.form.titleRequired'),
          },
          {
            min: 3,
            message: t('adminRolesPage.form.titleMin'),
          },
        ]}
        placeholder={t('common.fields.roleName')}
      />
      <ProFormTextArea
        name="description"
        label={t('common.fields.description')}
        placeholder={t('common.placeholders.descriptionOptional')}
      />
      <ProFormSwitch name="enabled" label={t('common.fields.enabled')} />
    </>
  );
}

type RolePermissionsFormSectionProps = {
  t: TFunction;
  allPermissions: { id: string; title: string }[];
  permissionsLoading: boolean;
};

function RolePermissionsFormSection({
  t,
  allPermissions,
  permissionsLoading,
}: RolePermissionsFormSectionProps) {
  return (
    <ProFormSelect
      name="permissionIds"
      label={t('common.fields.permissions')}
      mode="multiple"
      options={allPermissions.map((perm) => ({
        value: perm.id,
        label: perm.title,
      }))}
      fieldProps={{
        loading: permissionsLoading,
        showSearch: true,
        optionFilterProp: 'label',
        placeholder: t('common.placeholders.selectPermissions'),
      }}
      rules={[
        {
          required: true,
          message: t('adminRolesPage.form.permissionsRequired'),
        },
        {
          type: 'array',
          min: 1,
          message: t('adminRolesPage.form.permissionsMin'),
        },
      ]}
    />
  );
}

type RoleUsersFormSectionProps = {
  t: TFunction;
  users: Array<{ value: string; label: string }>;
  isLoadingUsers: boolean;
  onSearchUsers: (value: string) => void;
};

function RoleUsersFormSection({
  t,
  users,
  isLoadingUsers,
  onSearchUsers,
}: RoleUsersFormSectionProps) {
  return (
    <ProFormList
      name="players"
      label={t('common.fields.users')}
      creatorButtonProps={{
        position: 'bottom',
      }}
      copyIconProps={false}
      deleteIconProps={{
        tooltipText: t('common.cancel'),
      }}
    >
      {(field) => (
        <Space
          key={field.key}
          align="baseline"
          style={{ display: 'flex', gap: 16 }}
        >
          <ProFormSelect
            name="playerId"
            label={t('common.fields.users')}
            rules={[
              {
                required: true,
                message: t('adminRolesPage.form.titleRequired'),
              },
            ]}
            fieldProps={{
              loading: isLoadingUsers,
              showSearch: true,
              optionFilterProp: 'label',
              filterOption: false,
              onSearch: onSearchUsers,
              options: users,
              placeholder: t('common.placeholders.selectUsers'),
            }}
          />
          <ProFormDateTimePicker
            name="expiresAt"
            label={t('common.fields.expiresAt')}
            fieldProps={{
              showTime: true,
            }}
          />
        </Space>
      )}
    </ProFormList>
  );
}

export default function AdminRoleDetailPage() {
  const { roleId } = useParams<{ roleId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notification } = App.useApp();
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('ROLE.UPDATE');
  const isCreateMode = !roleId || roleId === 'new';

  const initialTab = (searchParams.get('tab') || 'general') as
    | 'general'
    | 'permissions'
    | 'players';
  const [tabKey, setTabKey] = useState<'general' | 'permissions' | 'players'>(
    initialTab,
  );

  const effectiveRoleId = isCreateMode ? undefined : roleId;
  const { data, isLoading } = useAdminRoleDetail(effectiveRoleId);
  const { data: allPermissions = [], isLoading: permissionsLoading } =
    useAdminPermissions();
  const [isEditing, setIsEditing] = useState(isCreateMode);
  const [users, setUsers] = useState<Array<{ value: string; label: string }>>(
    [],
  );
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const formRef = useRef<ProFormInstance<RoleFormValues>>(null);
  const upsertMutation = useUpsertRole({
    onSuccess: () => {
      notification.success({
        message: t('common.messages.saveSuccess'),
      });
      if (isCreateMode) {
        navigate('/admin/roles');
      } else {
        setIsEditing(false);
      }
    },
  });

  const permissionMap = useMemo(() => {
    const map = new Map<
      string,
      { title: string; description?: string | null }
    >();
    allPermissions.forEach((perm) => {
      map.set(perm.id, perm);
    });
    return map;
  }, [allPermissions]);

  const playerStats = useMemo(() => {
    if (!data) {
      return { total: 0, active: 0, expired: 0 };
    }
    const now = dayjs();
    let active = 0;
    let expired = 0;

    data.players.forEach((player) => {
      if (!player.expiresAt) {
        active += 1;
      } else {
        const expiryDate = dayjs(player.expiresAt);
        if (expiryDate.isBefore(now)) {
          expired += 1;
        } else {
          active += 1;
        }
      }
    });

    return {
      total: data.players.length,
      active,
      expired,
    };
  }, [data]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setTabKey(tab as typeof tabKey);
    }
  }, [searchParams]);

  const handleTabChange = (key: string) => {
    setTabKey(key as typeof tabKey);
    const targetRoleId = roleId ?? 'new';
    navigate(`/admin/roles/${targetRoleId}?tab=${key}`, { replace: true });
  };

  const editableRole = useMemo<AdminRole | null>(() => {
    if (!data) {
      return null;
    }
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      enabled: data.enabled,
      permissionIds: data.permissionIds,
      protected: data.protected,
    };
  }, [data]);

  const playerColumns: ProColumns<RolePlayerDetail>[] = [
    {
      title: t('common.fields.email'),
      dataIndex: 'email',
      copyable: true,
      ellipsis: true,
    },
    {
      title: t('common.fields.expiresAt'),
      dataIndex: 'expiresAt',
      render: (_, record) => {
        const meta = getRoleExpiryMeta(record.expiresAt);
        if (!record.expiresAt) {
          return (
            <Tag color="default">{t('adminUsersPage.roleExpiry.noExpiry')}</Tag>
          );
        }

        let statusLabel = t('adminUsersPage.roleExpiry.noExpiry');
        if (meta.status === 'active' && meta.date) {
          statusLabel = t('adminUsersPage.roleExpiry.activeUntil', {
            date: meta.date.format('DD/MM/YYYY'),
          });
        } else if (meta.status === 'soon' && meta.date) {
          statusLabel = t('adminUsersPage.roleExpiry.soonExpire', {
            date: meta.date.format('DD/MM/YYYY'),
          });
        } else if (meta.status === 'expired' && meta.date) {
          statusLabel = t('adminUsersPage.roleExpiry.expiredAt', {
            date: meta.date.format('DD/MM/YYYY'),
          });
        }

        return (
          <Tooltip
            title={
              <>
                <div>
                  {t('adminUsersPage.roleExpiry.tooltipStatus')}: {statusLabel}
                </div>
                <div>
                  {t('adminUsersPage.roleExpiry.tooltipExpiry')}:{' '}
                  {meta.date?.format('DD/MM/YYYY HH:mm') ?? '-'}
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
              {meta.date?.format('DD/MM/YYYY HH:mm') ?? '-'}
            </Tag>
          </Tooltip>
        );
      },
    },
  ];

  const breadcrumbTitle = isCreateMode
    ? t('adminRolesPage.create.title')
    : (data?.title ?? roleId);

  const formInitialValues = useMemo<Partial<RoleFormValues>>(() => {
    if (!data) {
      return {
        enabled: true,
        permissionIds: [],
        players: [],
      };
    }
    return {
      title: data.title,
      description: data.description ?? '',
      enabled: data.enabled,
      permissionIds: data.permissionIds,
      players:
        data.players.map((player) => ({
          playerId: player.id,
          expiresAt: player.expiresAt ? dayjs(player.expiresAt) : null,
        })) ?? [],
    };
  }, [data]);

  useEffect(() => {
    if (!data?.players) return;
    setUsers((prev) => {
      const existingIds = new Set(prev.map((u) => u.value));
      const next = [...prev];
      data.players.forEach((player) => {
        if (!existingIds.has(player.id)) {
          next.push({
            value: player.id,
            label: player.email,
          });
        }
      });
      return next;
    });
  }, [data]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current != null) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSearchUsers = (value: string) => {
    const search = value.trim();

    if (searchTimeoutRef.current != null) {
      window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    if (!search) {
      setIsLoadingUsers(false);
      return;
    }

    setIsLoadingUsers(true);

    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const response = await adminUsersService.list({
          take: 20,
          search,
        });
        setUsers((prev) => {
          const map = new Map(prev.map((u) => [u.value, u]));
          response.docs.forEach((user: { id: string; email: string }) => {
            map.set(user.id, { value: user.id, label: user.email });
          });
          return Array.from(map.values());
        });
      } finally {
        setIsLoadingUsers(false);
      }
    }, 300);
  };

  const handleCancelEdit = () => {
    if (isCreateMode) {
      navigate('/admin/roles');
      return;
    }
    setIsEditing(false);
    formRef.current?.setFieldsValue(formInitialValues);
  };

  const handleFormFinish = async (values: RoleFormValues) => {
    const permissionIds =
      values.permissionIds ??
      editableRole?.permissionIds ??
      formInitialValues.permissionIds ??
      [];

    const playersInput = values.players ?? formInitialValues.players ?? [];
    const payload: UpsertRoleDto = {
      ...(editableRole ? { id: editableRole.id } : {}),
      title: values.title.trim(),
      description:
        typeof values.description === 'string' &&
        values.description.trim().length > 0
          ? values.description.trim()
          : null,
      enabled: values.enabled ?? true,
      permissionIds,
      players: playersInput.map((player) => ({
        playerId: player.playerId,
        expiresAt: player.expiresAt
          ? (() => {
              const date = dayjs(player.expiresAt);
              return date.isValid() ? date.toISOString() : null;
            })()
          : null,
      })),
    };
    await upsertMutation.mutateAsync(payload);
  };

  const submitterButtons = [
    <Button
      key="cancel"
      onClick={handleCancelEdit}
      disabled={upsertMutation.isPending}
    >
      {t('common.cancel')}
    </Button>,
    <Button
      key="submit"
      type="primary"
      loading={upsertMutation.isPending}
      onClick={() => formRef.current?.submit?.()}
    >
      {isCreateMode ? t('common.actions.create') : t('common.save')}
    </Button>,
  ];

  const showEditButton =
    canUpdate && !isCreateMode && !isEditing && data && !data.protected;
  const pageExtra = showEditButton ? (
    <Space>
      <Button
        type="primary"
        disabled={isLoading}
        onClick={() => setIsEditing(true)}
      >
        {t('common.actions.edit')}
      </Button>
    </Space>
  ) : undefined;

  const showNotFound = !isLoading && !data && !isCreateMode;
  const showForm = canUpdate && isEditing;

  return (
    <AppPage
      title={
        isCreateMode
          ? t('adminRolesPage.create.title')
          : t('adminRolesPage.detail.title')
      }
      extra={pageExtra}
      breadcrumb={{
        items: [
          {
            title: <Link to="/admin/roles">{t('sidebar.adminRoles')}</Link>,
          },
          { title: breadcrumbTitle },
        ],
      }}
    >
      {isLoading && !isCreateMode && (
        <Skeleton active paragraph={{ rows: 6 }} />
      )}
      {showForm && (
        <Card>
          <ProForm<RoleFormValues>
            key={editableRole?.id ?? 'new'}
            formRef={formRef}
            layout="vertical"
            initialValues={formInitialValues}
            onFinish={handleFormFinish}
            submitter={{
              render: () => submitterButtons,
            }}
          >
            <Tabs
              items={[
                {
                  key: 'general',
                  label: t('adminRolesPage.form.tabs.general'),
                  children: <RoleGeneralFormSection t={t} />,
                },
                {
                  key: 'permissions',
                  label: t('adminRolesPage.form.tabs.permissions'),
                  children: (
                    <RolePermissionsFormSection
                      t={t}
                      allPermissions={allPermissions}
                      permissionsLoading={permissionsLoading}
                    />
                  ),
                },
                {
                  key: 'users',
                  label: t('adminRolesPage.form.tabs.users'),
                  children: (
                    <RoleUsersFormSection
                      t={t}
                      users={users}
                      isLoadingUsers={isLoadingUsers}
                      onSearchUsers={handleSearchUsers}
                    />
                  ),
                },
              ]}
            />
          </ProForm>
        </Card>
      )}
      {showNotFound && (
        <Alert type="warning" title={t('errors.itemNotFound')} showIcon />
      )}
      {!showNotFound && !isLoading && !isEditing && (
        <Tabs
          activeKey={tabKey}
          onChange={handleTabChange}
          items={[
            {
              key: 'general',
              label: t('adminRolesPage.detail.tabGeneral'),
              children: (
                <ProDescriptions column={1} bordered>
                  <ProDescriptions.Item label={t('common.fields.roleName')}>
                    {data?.title ?? '-'}
                  </ProDescriptions.Item>
                  <ProDescriptions.Item label={t('common.fields.description')}>
                    {data?.description ?? '-'}
                  </ProDescriptions.Item>
                  <ProDescriptions.Item label={t('common.fields.enabled')}>
                    {data ? (
                      <Tag color={data.enabled ? 'green' : 'red'}>
                        {data.enabled
                          ? t('common.enabled')
                          : t('common.disabled')}
                      </Tag>
                    ) : (
                      <Tag color="default">-</Tag>
                    )}
                  </ProDescriptions.Item>
                  <ProDescriptions.Item label={t('common.fields.users')}>
                    <Tooltip
                      title={t('adminRolesPage.users.tooltip', {
                        total: playerStats.total,
                        active: playerStats.active,
                        expired: playerStats.expired,
                      })}
                    >
                      <Space>
                        <Tag color="blue">
                          {t('adminRolesPage.users.total')}: {playerStats.total}
                        </Tag>
                        <Tag color="green">
                          {t('adminRolesPage.users.active')}:{' '}
                          {playerStats.active}
                        </Tag>
                        <Tag color="default">
                          {t('adminRolesPage.users.expired')}:{' '}
                          {playerStats.expired}
                        </Tag>
                      </Space>
                    </Tooltip>
                  </ProDescriptions.Item>
                </ProDescriptions>
              ),
            },
            {
              key: 'permissions',
              label: t('adminRolesPage.detail.tabPermissions'),
              children: (
                <ProTable
                  rowKey="id"
                  search={false}
                  pagination={false}
                  loading={permissionsLoading}
                  dataSource={(data?.permissionIds ?? [])
                    .map((id) => {
                      const perm = permissionMap.get(id);
                      if (!perm) return null;
                      return {
                        id,
                        title: perm.title,
                        description: perm.description ?? null,
                      };
                    })
                    .filter(
                      (
                        item,
                      ): item is {
                        id: string;
                        title: string;
                        description: string | null;
                      } => item !== null,
                    )}
                  columns={[
                    {
                      title: t('common.fields.permissions'),
                      dataIndex: 'title',
                      copyable: true,
                    },
                    {
                      title: t('common.fields.description'),
                      dataIndex: 'description',
                      render: (_, record) => record.description ?? '-',
                    },
                  ]}
                />
              ),
            },
            {
              key: 'players',
              label: t('adminRolesPage.detail.tabPlayers'),
              children: (
                <ProTable
                  rowKey="id"
                  search={false}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) =>
                      t('common.pagination.total', { total }),
                    pageSizeOptions: ['10', '20', '50', '100'],
                  }}
                  dataSource={data?.players ?? []}
                  columns={playerColumns}
                />
              ),
            },
          ]}
        />
      )}
    </AppPage>
  );
}
