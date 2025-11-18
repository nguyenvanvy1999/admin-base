import { Textarea, TextInput } from '@mantine/core';
import {
  type IUpsertTagDto,
  type TagResponse,
  UpsertTagDto,
} from '@server/dto/tag.dto';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ZodFormController } from '../ZodFormController';
import { CRUDDialog } from './CRUDDialog';

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
}: AddEditTagDialogProps) => {
  const { t } = useTranslation();

  const defaultValues: FormValue = {
    name: '',
    description: '',
  };

  const getFormValues = (tag: TagResponse): FormValue => ({
    id: tag.id,
    name: tag.name,
    description: tag.description || '',
  });

  const handleSubmit = (data: FormValue, saveAndAdd?: boolean) => {
    const isEditMode = !!tag;

    const submitData: IUpsertTagDto = {
      name: data.name.trim(),
    };

    if (isEditMode && tag) {
      submitData.id = tag.id;
    }

    if (data.description && data.description.trim() !== '') {
      submitData.description = data.description.trim();
    }

    onSubmit(submitData, saveAndAdd);
  };

  return (
    <CRUDDialog
      isOpen={isOpen}
      onClose={onClose}
      item={tag}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      title={{
        add: t('tags.addTag'),
        edit: t('tags.editTag'),
      }}
      schema={schema}
      defaultValues={defaultValues}
      getFormValues={getFormValues}
      size="md"
    >
      {({ control }) => (
        <>
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
        </>
      )}
    </CRUDDialog>
  );
};

export default AddEditTagDialog;
