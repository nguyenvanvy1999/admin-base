import { useZodForm } from '@client/hooks/useZodForm';
import { Button, Group, Modal, Stack } from '@mantine/core';
import {
  type IUpsertTagDto,
  type TagResponse,
  UpsertTagDto,
} from '@server/dto/tag.dto';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Textarea } from './Textarea';
import { TextInput } from './TextInput';
import { ZodFormController } from './ZodFormController';

const schema = UpsertTagDto.extend({
  name: z.string().min(1, 'tags.nameRequired'),
});

type FormValue = z.infer<typeof schema>;

type AddEditTagDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  tag: TagResponse | null;
  onSubmit: (data: IUpsertTagDto, saveAndAdd?: boolean) => void;
  isLoading?: boolean;
  resetTrigger?: number;
};

const AddEditTagDialog = ({
  isOpen,
  onClose,
  tag,
  onSubmit,
  isLoading = false,
  resetTrigger,
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

  useEffect(() => {
    if (resetTrigger && resetTrigger > 0 && !tag && isOpen) {
      reset(defaultValues);
    }
  }, [resetTrigger, tag, isOpen, reset]);

  const onSubmitForm = handleSubmit((data) => {
    const submitData: IUpsertTagDto = {
      name: data.name.trim(),
    };

    if (isEditMode && tag) {
      submitData.id = tag.id;
    }

    if (data.description && data.description.trim() !== '') {
      submitData.description = data.description.trim();
    }

    onSubmit(submitData, false);
  });

  const onSubmitFormAndAdd = handleSubmit((data) => {
    const submitData: IUpsertTagDto = {
      name: data.name.trim(),
    };

    if (data.description && data.description.trim() !== '') {
      submitData.description = data.description.trim();
    }

    onSubmit(submitData, true);
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
            {!isEditMode && (
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  onSubmitFormAndAdd();
                }}
                disabled={isLoading}
              >
                {t('common.saveAndAdd')}
              </Button>
            )}
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
