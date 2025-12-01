import {
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useTranslation } from 'react-i18next';
import { FormModal } from 'src/components/common/FormModal';
import { useCreateAdminUser } from 'src/features/admin/users/hooks/useAdminUsers';
import { useNotify } from 'src/hooks/useNotify';
import {
  ADMIN_USER_STATUSES,
  type AdminUserCreatePayload,
} from 'src/types/admin-users';

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

  const createMutation = useCreateAdminUser({
    onSuccess: ({ auditLogId }) => {
      notify.notification.success({
        message: t('adminUsersPage.create.success'),
        description: t('adminUsersPage.create.auditLog', {
          auditId: auditLogId,
        }),
      });
      onSuccess?.();
    },
  });

  const handleSubmit = async (values: AdminUserCreatePayload) => {
    await createMutation.mutateAsync({
      ...values,
      roleIds: values.roleIds?.filter(Boolean),
      name: values.name?.trim() ? values.name : undefined,
      baseCurrencyId: values.baseCurrencyId?.trim()
        ? values.baseCurrencyId
        : undefined,
    });
  };

  return (
    <FormModal<AdminUserCreatePayload>
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
        mode="tags"
        placeholder="admin"
      />
      <ProFormText
        name="baseCurrencyId"
        label={t('adminUsersPage.form.baseCurrency')}
        placeholder="USD"
      />
      <ProFormSelect
        name="status"
        label={t('adminUsersPage.form.status')}
        options={ADMIN_USER_STATUSES.map((status) => ({
          value: status,
          label: status.toUpperCase(),
        }))}
      />
      <ProFormSwitch
        name="emailVerified"
        label={t('adminUsersPage.form.emailVerified')}
      />
    </FormModal>
  );
}
