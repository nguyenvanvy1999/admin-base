import type { TagFormData, TagFull } from '@client/types/tag';
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

type AddEditTagDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  tag: TagFull | null;
  onSubmit: (data: TagFormData) => void;
  isLoading?: boolean;
};

const AddEditTagDialog = ({
  isOpen,
  onClose,
  tag,
  onSubmit,
  isLoading = false,
}: AddEditTagDialogProps) => {
  const { t } = useTranslation();
  const isEditMode = !!tag;
  const validation = useValidation();

  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
    },
    onSubmit: ({ value }) => {
      const submitData: TagFormData = {
        name: value.name.trim(),
      };

      if (isEditMode && tag) {
        submitData.id = tag.id;
      }

      if (value.description && value.description.trim() !== '') {
        submitData.description = value.description.trim();
      }

      onSubmit(submitData);
    },
  });

  useEffect(() => {
    if (tag) {
      form.setFieldValue('name', tag.name);
      form.setFieldValue('description', tag.description || '');
    } else {
      form.reset();
    }
  }, [tag, isOpen, form]);

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={isEditMode ? t('tags.editTag') : t('tags.addTag')}
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
              onChange: validation.required('tags.nameRequired'),
            }}
          >
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <TextInput
                  label={t('tags.name')}
                  placeholder={t('tags.namePlaceholder')}
                  required
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={error}
                />
              );
            }}
          </form.Field>

          <form.Field name="description">
            {(field) => {
              const error = field.state.meta.errors[0];
              return (
                <Textarea
                  label={t('tags.description')}
                  placeholder={t('tags.descriptionPlaceholder')}
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

export default AddEditTagDialog;
