import {
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Tabs } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal } from 'src/components/common/FormModal';
import { useAdminPermissions } from 'src/hooks/api/useAdminPermissions';
import { adminUsersService } from 'src/services/api/admin-users.service';
import type { AdminRole, UpsertRoleDto } from 'src/types/admin-roles';

interface RoleFormModalProps {
  open: boolean;
  role: AdminRole | null;
  onClose: () => void;
  onSubmit: (data: UpsertRoleDto) => Promise<void>;
  loading?: boolean;
}

type RoleFormValues = UpsertRoleDto & Record<string, unknown>;

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
  const [users, setUsers] = useState<Array<{ value: string; label: string }>>(
    [],
  );
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

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
        title: role.title,
        description: role.description ?? '',
        enabled: true,
        permissionIds: role.permissionIds,
        playerIds: role.playerIds,
      }
    : {
        enabled: true,
        permissionIds: [],
        playerIds: [],
      };

  const handleSubmit = async (values: RoleFormValues) => {
    const permissionIds =
      (values.permissionIds as string[] | undefined) ??
      role?.permissionIds ??
      [];
    const playerIds =
      (values.playerIds as string[] | undefined) ?? role?.playerIds ?? [];

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
      playerIds,
    };
    await onSubmit(payload);
  };

  return (
    <FormModal<RoleFormValues>
      key={role?.id || 'new'}
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={
        role
          ? t('adminRolesPage.update.title')
          : t('adminRolesPage.create.title')
      }
      okText={role ? t('common.save') : t('adminRolesPage.create.button')}
      loading={loading}
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
              <ProFormSelect
                name="playerIds"
                label={t('adminRolesPage.form.users')}
                mode="multiple"
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
            ),
          },
        ]}
      />
    </FormModal>
  );
}
