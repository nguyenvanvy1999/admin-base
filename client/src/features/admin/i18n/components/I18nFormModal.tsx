import { ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { useTranslation } from 'react-i18next';
import { FormModal } from 'src/components/common/FormModal';
import { sanitizeFormValues } from 'src/lib/utils/form.utils';
import type { I18n, I18nUpsertDto } from 'src/types/admin-i18n';

interface I18nFormModalProps {
  open: boolean;
  i18nEntry: I18n | null;
  onClose: () => void;
  onSubmit: (data: I18nUpsertDto) => Promise<void>;
  loading?: boolean;
}

export function I18nFormModal({
  open,
  i18nEntry,
  onClose,
  onSubmit,
  loading = false,
}: I18nFormModalProps) {
  const { t } = useTranslation();

  const isEditMode = !!i18nEntry;

  const handleSubmit = async (values: I18nUpsertDto) => {
    await onSubmit({
      ...sanitizeFormValues(values),
      id: i18nEntry?.id,
    });
  };

  const initialValues: Partial<I18nUpsertDto> = i18nEntry
    ? {
        key: i18nEntry.key,
        en: i18nEntry.en,
        vi: i18nEntry.vi,
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
          ? t('adminI18nPage.form.editTitle')
          : t('adminI18nPage.form.createTitle')
      }
      initialValues={initialValues}
      loading={loading}
      mode={isEditMode ? 'edit' : 'create'}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      width={600}
      formProps={{
        layout: 'vertical',
      }}
    >
      <ProFormText
        name="key"
        label={t('common.fields.key')}
        rules={[
          {
            required: true,
            message: t('adminI18nPage.form.keyRequired'),
          },
        ]}
        fieldProps={{
          placeholder: t('common.placeholders.translationKey'),
        }}
        disabled={isEditMode}
      />

      <ProFormTextArea
        name="en"
        label={t('common.fields.english')}
        fieldProps={{
          rows: 3,
          placeholder: t('common.placeholders.englishTranslation'),
        }}
      />

      <ProFormTextArea
        name="vi"
        label={t('common.fields.vietnamese')}
        fieldProps={{
          rows: 3,
          placeholder: t('common.placeholders.vietnameseTranslation'),
        }}
      />
    </FormModal>
  );
}
