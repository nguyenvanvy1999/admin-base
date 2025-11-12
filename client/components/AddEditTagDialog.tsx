import { useZodForm } from '@client/hooks/useZodForm';
import type { TagFormData, TagFull } from '@client/types/tag';
import { Button, Group, Modal, Stack } from '@mantine/core';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Textarea } from './Textarea';
import { TextInput } from './TextInput';
import { ZodFormController } from './ZodFormController';

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'tags.nameRequired'),
  description: z.string().optional(),
});

type FormValue = z.infer<typeof schema>;

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

  const defaultValues: FormValue = {
    name: '',
    description: '',
  };

  const { control, handleSubmit, reset } = useZodForm({
    zod: schema,
    defaultValues,
  });

  useEffect(() => {
    if (tag) {
      reset({
        id: tag.id,
        name: tag.name,
        description: tag.description || '',
      });
    } else {
      reset(defaultValues);
    }
  }, [tag, isOpen, reset]);

  const onSubmitForm = handleSubmit((data) => {
    const submitData: TagFormData = {
      name: data.name.trim(),
    };

    if (isEditMode && tag) {
      submitData.id = tag.id;
    }

    if (data.description && data.description.trim() !== '') {
      submitData.description = data.description.trim();
    }

    onSubmit(submitData);
  });

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={isEditMode ? t('tags.editTag') : t('tags.addTag')}
      size="md"
    >
      <form onSubmit={onSubmitForm}>
        <Stack gap="md">
          <ZodFormController
            control={control}
            name="name"
            render={({ field, fieldState: { error } }) => (
              <TextInput
                label={t('tags.name')}
                placeholder={t('tags.namePlaceholder')}
                required
                error={error}
                {...field}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="description"
            render={({ field, fieldState: { error } }) => (
              <Textarea
                label={t('tags.description')}
                placeholder={t('tags.descriptionPlaceholder')}
                error={error}
                rows={3}
                {...field}
              />
            )}
          />

          <Group justify="flex-end" mt="md">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? t('common.saving', { defaultValue: 'Saving...' })
                : isEditMode
                  ? t('common.save')
                  : t('common.add')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default AddEditTagDialog;
