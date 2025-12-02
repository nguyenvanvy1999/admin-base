import {
  ProFormDateTimePicker,
  ProFormList,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Space, Tabs } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal } from 'src/components/common/FormModal';
import { useAdminPermissions } from 'src/hooks/api/useAdminPermissions';
import { useAdminRoleDetail } from 'src/hooks/api/useAdminRoles';
import { adminUsersService } from 'src/services/api/admin-users.service';
import type { AdminRole, UpsertRoleDto } from 'src/types/admin-roles';

interface RoleFormModalProps {
  open: boolean;
  role: AdminRole | null;
  onClose: () => void;
  onSubmit: (data: UpsertRoleDto) => Promise<void>;
  loading?: boolean;
}

type RoleFormValues = Omit<UpsertRoleDto, 'players'> & {
  players: {
    playerId: string;
    expiresAt: dayjs.Dayjs | null;
  }[];
} & Record<string, unknown>;

export function RoleFormModal({
  open,
  role,
  onClose,
  onSubmit,
  loading,
}: RoleFormModalProps) {
  const { t } = useTranslation();
  const { data: permissions, isLoading: isLoadingPermissions } =
    useAdminPermissions();
  const { data: roleDetail, isLoading: isLoadingRoleDetail } =
    useAdminRoleDetail(role?.id);
  const [users, setUsers] = useState<Array<{ value: string; label: string }>>(
    [],
  );
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (!roleDetail?.players) return;

    setUsers((prev) => {
      const existingIds = new Set(prev.map((u) => u.value));
      const next = [...prev];

      for (const player of roleDetail.players) {
        if (!existingIds.has(player.id)) {
          next.push({
            value: player.id,
            label: player.email,
          });
        }
      }

      return next;
    });
  }, [roleDetail]);

  const handleSearchUsers = async (value: string) => {
    const search = value.trim();
    if (!search) {
      setUsers([]);
      return;
    }

    setIsLoadingUsers(true);
    try {
      const response = await adminUsersService.list({
        take: 20,
        search,
      });
      setUsers(
        response.docs.map((user) => ({
          value: user.id,
          label: user.email,
        })),
      );
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const initialValues: Partial<RoleFormValues> = role
    ? {
        id: role.id,
        title: roleDetail?.title ?? role.title,
        description: roleDetail?.description ?? role.description ?? '',
        enabled: roleDetail?.enabled ?? role.enabled ?? true,
        permissionIds: roleDetail?.permissionIds ?? role.permissionIds,
        players:
          roleDetail?.players.map((player) => ({
            playerId: player.id,
            expiresAt: player.expiresAt ? dayjs(player.expiresAt) : null,
          })) ?? [],
      }
    : {
        enabled: true,
        permissionIds: [],
        players: [],
      };

  const handleSubmit = async (values: RoleFormValues) => {
    const permissionIds =
      (values.permissionIds as string[] | undefined) ??
      role?.permissionIds ??
      [];
    const players = values.players ?? [];

    const payload: UpsertRoleDto = {
      ...(role ? { id: role.id } : {}),
      title: values.title.trim(),
      description:
        typeof values.description === 'string' &&
        values.description.trim().length > 0
          ? values.description.trim()
          : null,
      enabled: values.enabled ?? true,
      permissionIds,
      players: players.map((player) => ({
        playerId: player.playerId,
        expiresAt: player.expiresAt ? player.expiresAt.toISOString() : null,
      })),
    };
    await onSubmit(payload);
  };

  return (
    <FormModal<RoleFormValues>
      key={role ? `${role.id}-${roleDetail ? 'detail' : 'loading'}` : 'new'}
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={
        role
          ? t('adminRolesPage.update.title')
          : t('adminRolesPage.create.title')
      }
      okText={role ? t('common.save') : t('adminRolesPage.create.button')}
      loading={loading || (role != null && isLoadingRoleDetail)}
      mode={role ? 'edit' : 'create'}
      initialValues={initialValues}
      width={800}
      formProps={{
        layout: 'vertical',
      }}
    >
      <Tabs
        items={[
          {
            key: 'general',
            label: t('adminRolesPage.form.tabs.general'),
            children: (
              <>
                <ProFormText
                  name="title"
                  label={t('adminRolesPage.form.title')}
                  rules={[
                    {
                      required: true,
                      message: t('adminRolesPage.form.titleRequired'),
                    },
                    { min: 3, message: t('adminRolesPage.form.titleMin') },
                  ]}
                  placeholder={t('adminRolesPage.form.titlePlaceholder')}
                />
                <ProFormTextArea
                  name="description"
                  label={t('adminRolesPage.form.description')}
                  placeholder={t('adminRolesPage.form.descriptionPlaceholder')}
                />
                <ProFormSwitch
                  name="enabled"
                  label={t('adminRolesPage.form.enabled')}
                />
              </>
            ),
          },
          {
            key: 'permissions',
            label: t('adminRolesPage.form.tabs.permissions'),
            children: (
              <ProFormSelect
                name="permissionIds"
                label={t('adminRolesPage.form.permissions')}
                mode="multiple"
                options={
                  permissions?.map((perm) => ({
                    value: perm.id,
                    label: perm.title,
                  })) ?? []
                }
                fieldProps={{
                  loading: isLoadingPermissions,
                  showSearch: true,
                  optionFilterProp: 'label',
                  placeholder: t('adminRolesPage.form.permissionsPlaceholder'),
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
            ),
          },
          {
            key: 'users',
            label: t('adminRolesPage.form.tabs.users'),
            children: (
              <ProFormList
                name="players"
                label={t('adminRolesPage.form.users')}
                creatorButtonProps={{
                  position: 'bottom',
                }}
                copyIconProps={false}
                deleteIconProps={{
                  tooltipText: t('common.cancel'),
                }}
              >
                {(field) => (
                  <Space align="baseline" style={{ display: 'flex', gap: 16 }}>
                    <ProFormSelect
                      name="playerId"
                      label={t('adminRolesPage.form.users')}
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
                        onSearch: handleSearchUsers,
                        options: users,
                        placeholder: t('adminRolesPage.form.usersPlaceholder'),
                      }}
                    />
                    <ProFormDateTimePicker
                      name="expiresAt"
                      label={t('adminRolesPage.form.users')}
                      fieldProps={{
                        showTime: true,
                      }}
                    />
                  </Space>
                )}
              </ProFormList>
            ),
          },
        ]}
      />
    </FormModal>
  );
}
