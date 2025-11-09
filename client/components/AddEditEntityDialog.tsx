import type { EntityFormData, EntityFull } from '@client/types/entity';
import {
  Button,
  Group,
  Modal,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@tanstack/react-form';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useValidation } from './utils/validation';

type AddEditEntityDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  entity: EntityFull | null;
  onSubmit: (data: EntityFormData) => void;
  isLoading?: boolean;
};

const AddEditEntityDialog = ({
  isOpen,
  onClose,
  entity,
  onSubmit,
  isLoading = false,
}: AddEditEntityDialogProps) => {
  const { t } = useTranslation();
  const isEditMode = !!entity;
  const validation = useValidation();

  const form = useForm({
    defaultValues: {
      name: '',
      type: '',
      phone: '',
      email: '',
      address: '',
      note: '',
    },
    onSubmit: ({ value }) => {
      const submitData: EntityFormData = {
        name: value.name.trim(),
      };

      if (isEditMode && entity) {
        submitData.id = entity.id;
      }

      if (value.type && value.type.trim() !== '') {
        submitData.type = value.type.trim();
      }

      if (value.phone && value.phone.trim() !== '') {
        submitData.phone = value.phone.trim();
      }

      if (value.email && value.email.trim() !== '') {
        submitData.email = value.email.trim();
      }

      if (value.address && value.address.trim() !== '') {
        submitData.address = value.address.trim();
      }

      if (value.note && value.note.trim() !== '') {
        submitData.note = value.note.trim();
      }

      onSubmit(submitData);
    },
  });

  useEffect(() => {
    if (entity) {
      form.setFieldValue('name', entity.name);
      form.setFieldValue('type', entity.type || '');
      form.setFieldValue('phone', entity.phone || '');
      form.setFieldValue('email', entity.email || '');
      form.setFieldValue('address', entity.address || '');
      form.setFieldValue('note', entity.note || '');
    } else {
      form.setFieldValue('name', '');
      form.setFieldValue('type', '');
      form.setFieldValue('phone', '');
      form.setFieldValue('email', '');
      form.setFieldValue('address', '');
      form.setFieldValue('note', '');
    }
  }, [entity, isOpen, form]);

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={isEditMode ? t('entities.editEntity') : t('entities.addEntity')}
      size="md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <Stack gap="md">
          <form.Field
            name="name"
            validators={{
              onChange: validation.required('entities.nameRequired'),
            }}
          >
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <TextInput
                  label={t('entities.name')}
                  placeholder={t('entities.namePlaceholder')}
                  required
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={error}
                />
              );
            }}
          </form.Field>

          <form.Field name="type">
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <TextInput
                  label={t('entities.type')}
                  placeholder={t('entities.typePlaceholder')}
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={error}
                />
              );
            }}
          </form.Field>

          <form.Field name="phone">
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <TextInput
                  label={t('entities.phone')}
                  placeholder={t('entities.phonePlaceholder')}
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={error}
                />
              );
            }}
          </form.Field>

          <form.Field name="email">
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <TextInput
                  type="email"
                  label={t('entities.email')}
                  placeholder={t('entities.emailPlaceholder')}
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={error}
                />
              );
            }}
          </form.Field>

          <form.Field name="address">
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <TextInput
                  label={t('entities.address')}
                  placeholder={t('entities.addressPlaceholder')}
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={error}
                />
              );
            }}
          </form.Field>

          <form.Field name="note">
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <Textarea
                  label={t('entities.note')}
                  placeholder={t('entities.notePlaceholder')}
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={error}
                  rows={3}
                />
              );
            }}
          </form.Field>

          <form.Subscribe
            selector={(state) => ({
              isValid: state.isValid,
              values: state.values,
            })}
          >
            {({ isValid, values }) => {
              const isFormValid = isValid && values.name?.trim() !== '';

              return (
                <Group justify="flex-end" mt="md">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={isLoading || !isFormValid}>
                    {isLoading
                      ? t('common.saving', { defaultValue: 'Saving...' })
                      : isEditMode
                        ? t('common.save')
                        : t('common.add')}
                  </Button>
                </Group>
              );
            }}
          </form.Subscribe>
        </Stack>
      </form>
    </Modal>
  );
};

export default AddEditEntityDialog;
