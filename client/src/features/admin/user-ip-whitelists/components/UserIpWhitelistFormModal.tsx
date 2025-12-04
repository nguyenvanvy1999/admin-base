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
}

export function UserIpWhitelistFormModal({
  open,
  entry,
  onClose,
  onSubmit,
  loading = false,
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
    : {};

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
      <ProFormText
        name="userId"
        label={t('adminUserIpWhitelistPage.form.userId', 'User ID')}
        rules={[
          {
            required: true,
            message: t(
              'adminUserIpWhitelistPage.form.userIdRequired',
              'Please enter user ID',
            ),
          },
        ]}
        fieldProps={{
          placeholder: t(
            'adminUserIpWhitelistPage.form.userIdPlaceholder',
            'Enter user ID',
          ),
        }}
        disabled={isEditMode}
      />

      <ProFormText
        name="ip"
        label={t('adminUserIpWhitelistPage.form.ip', 'IP Address')}
        rules={[
          {
            required: true,
            message: t(
              'adminUserIpWhitelistPage.form.ipRequired',
              'Please enter IP address',
            ),
          },
        ]}
        fieldProps={{
          placeholder: t(
            'adminUserIpWhitelistPage.form.ipPlaceholder',
            'e.g. 192.168.1.1',
          ),
        }}
        disabled={isEditMode}
      />

      <ProFormTextArea
        name="note"
        label={t('adminUserIpWhitelistPage.form.note', 'Note')}
        fieldProps={{
          placeholder: t(
            'adminUserIpWhitelistPage.form.notePlaceholder',
            'Optional note',
          ),
          rows: 3,
        }}
      />
    </FormModal>
  );
}
