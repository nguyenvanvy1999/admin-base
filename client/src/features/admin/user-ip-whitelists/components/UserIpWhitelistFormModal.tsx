import { ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { useTranslation } from 'react-i18next';
import { FormModal } from 'src/components/common/FormModal';
import { sanitizeFormValues } from 'src/lib/utils/form.utils';
import type {
  UserIpWhitelist,
  UserIpWhitelistFormData,
} from 'src/types/admin-user-ip-whitelist';

interface UserIpWhitelistFormModalProps {
  open: boolean;
  entry: UserIpWhitelist | null;
  onClose: () => void;
  onSubmit: (data: UserIpWhitelistFormData) => Promise<void>;
  loading?: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
}

export function UserIpWhitelistFormModal({
  open,
  entry,
  onClose,
  onSubmit,
  loading = false,
  currentUserId,
  isAdmin = false,
}: UserIpWhitelistFormModalProps) {
  const { t } = useTranslation();

  const isEditMode = !!entry;

  const handleSubmit = async (values: UserIpWhitelistFormData) => {
    await onSubmit(sanitizeFormValues(values) as UserIpWhitelistFormData);
  };

  const initialValues: Partial<UserIpWhitelistFormData> = entry
    ? {
        id: entry.id,
        userId: entry.userId,
        ip: entry.ip,
        note: entry.note || undefined,
      }
    : {
        userId: !isAdmin ? currentUserId : undefined,
      };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSubmit={
        handleSubmit as unknown as (
          values: Record<string, unknown>,
        ) => Promise<void>
      }
      title={
        isEditMode
          ? t(
              'adminUserIpWhitelistPage.form.editTitle',
              'Edit User IP Whitelist',
            )
          : t(
              'adminUserIpWhitelistPage.form.createTitle',
              'Create User IP Whitelist',
            )
      }
      initialValues={initialValues}
      loading={loading}
      mode={isEditMode ? 'edit' : 'create'}
      okText={t('common.save', 'Save')}
      cancelText={t('common.cancel', 'Cancel')}
      width={500}
      formProps={{
        layout: 'vertical',
      }}
    >
      {isEditMode && <ProFormText name="id" hidden />}

      <ProFormText
        name="userId"
        label={t('adminUserIpWhitelistPage.form.userId')}
        rules={[
          {
            required: true,
            message: t('adminUserIpWhitelistPage.form.userIdRequired'),
          },
        ]}
        fieldProps={{
          placeholder: t('adminUserIpWhitelistPage.form.userIdPlaceholder'),
        }}
        disabled={isEditMode || !isAdmin}
      />

      <ProFormText
        name="ip"
        label={t('adminUserIpWhitelistPage.form.ip')}
        rules={[
          {
            required: true,
            message: t('adminUserIpWhitelistPage.form.ipRequired'),
          },
        ]}
        fieldProps={{
          placeholder: t('adminUserIpWhitelistPage.form.ipPlaceholder'),
        }}
        disabled={isEditMode}
      />

      <ProFormTextArea
        name="note"
        label={t('adminUserIpWhitelistPage.form.note')}
        fieldProps={{
          placeholder: t('adminUserIpWhitelistPage.form.notePlaceholder'),
          rows: 3,
        }}
      />
    </FormModal>
  );
}
