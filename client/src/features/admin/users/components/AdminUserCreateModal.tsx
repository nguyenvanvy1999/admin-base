import {
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useTranslation } from 'react-i18next';
import { AppAdminUserStatusSelect } from 'src/components/common/AppAdminUserStatusSelect';
import { FormModal } from 'src/components/common/FormModal';
import { useCreateAdminUser } from 'src/features/admin/users/hooks/useAdminUsers';
import { useAdminRoles } from 'src/hooks/api/useAdminRoles';
import { useNotify } from 'src/hooks/useNotify';
import type { AdminUserCreatePayload } from 'src/types/admin-users';

interface AdminUserCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AdminUserCreateModal({
  open,
  onClose,
  onSuccess,
}: AdminUserCreateModalProps) {
  const { t } = useTranslation();
  const notify = useNotify();
  const { data: roles, isLoading: isLoadingRoles } = useAdminRoles();

  const createMutation = useCreateAdminUser({
    onSuccess: ({ auditLogId }) => {
      notify.notification.success({
        title: t('adminUsersPage.create.success'),
        description: t('adminUsersPage.create.auditLog', {
          auditId: auditLogId,
        }),
      });
      onSuccess?.();
    },
  });

  type AdminUserCreateFormValues = AdminUserCreatePayload &
    Record<string, unknown>;

  const handleSubmit = async (values: AdminUserCreateFormValues) => {
    const payload: AdminUserCreatePayload = {
      email: values.email,
      password: values.password,
      roleIds: (values.roleIds as string[] | undefined)?.filter(Boolean),
      name:
        typeof values.name === 'string' && values.name.trim().length > 0
          ? values.name
          : undefined,
      status: values.status,
      emailVerified: values.emailVerified,
    };

    await createMutation.mutateAsync(payload);
  };

  return (
    <FormModal<AdminUserCreateFormValues>
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('adminUsersPage.create.title')}
      okText={t('adminUsersPage.create.button')}
      loading={createMutation.isPending}
    >
      <ProFormText
        name="email"
        label={t('adminUsersPage.form.email')}
        rules={[
          { required: true, message: t('adminUsersPage.form.email') },
          { type: 'email' },
        ]}
      />
      <ProFormText.Password
        name="password"
        label={t('adminUsersPage.form.password')}
        rules={[{ required: true }]}
      />
      <ProFormTextArea
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
      <ProFormSelect
        name="status"
        label={t('adminUsersPage.form.status')}
        fieldProps={{
          showSearch: true,
          optionFilterProp: 'label',
        }}
        options={undefined}
      >
        <AppAdminUserStatusSelect
          style={{ width: '100%' }}
          placeholder={t('adminUsersPage.form.status')}
        />
      </ProFormSelect>
      <ProFormSwitch
        name="emailVerified"
        label={t('adminUsersPage.form.emailVerified')}
      />
    </FormModal>
  );
}
