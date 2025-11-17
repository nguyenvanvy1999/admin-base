import { Textarea, TextInput } from '@mantine/core';
import {
  type EntityResponse,
  type IUpsertEntityDto,
  UpsertEntityDto,
} from '@server/dto/entity.dto';
import { EntityType } from '@server/generated';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { CRUDDialog } from './CRUDDialog';
import { Select } from './Select';
import { ZodFormController } from './ZodFormController';

const schema = UpsertEntityDto.extend({
  name: z.string().min(1, 'entities.nameRequired'),
  type: z.enum(EntityType, {
    message: 'entities.typeRequired',
  }),
});

type FormValue = z.infer<typeof schema>;

type AddEditEntityDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  entity: EntityResponse | null;
  onSubmit: (data: IUpsertEntityDto, saveAndAdd?: boolean) => void;
  isLoading?: boolean;
  resetTrigger?: number;
};

const AddEditEntityDialog = ({
  isOpen,
  onClose,
  entity,
  onSubmit,
  isLoading = false,
}: AddEditEntityDialogProps) => {
  const { t } = useTranslation();

  const defaultValues: FormValue = {
    name: '',
    type: EntityType.individual,
    phone: '',
    email: '',
    address: '',
    note: '',
  };

  const getFormValues = (entity: EntityResponse): FormValue => ({
    id: entity.id,
    name: entity.name,
    type: entity.type || EntityType.individual,
    phone: entity.phone || '',
    email: entity.email || '',
    address: entity.address || '',
    note: entity.note || '',
  });

  const handleSubmit = (data: FormValue, saveAndAdd?: boolean) => {
    const isEditMode = !!entity;

    const submitData: IUpsertEntityDto = {
      name: data.name.trim(),
      type: data.type,
    };

    if (isEditMode && entity) {
      submitData.id = entity.id;
    }

    if (data.phone && data.phone.trim() !== '') {
      submitData.phone = data.phone.trim();
    }

    if (data.email && data.email.trim() !== '') {
      submitData.email = data.email.trim();
    }

    if (data.address && data.address.trim() !== '') {
      submitData.address = data.address.trim();
    }

    if (data.note && data.note.trim() !== '') {
      submitData.note = data.note.trim();
    }

    onSubmit(submitData, saveAndAdd);
  };

  return (
    <CRUDDialog
      isOpen={isOpen}
      onClose={onClose}
      item={entity}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      title={{
        add: t('entities.addEntity'),
        edit: t('entities.editEntity'),
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
                label={t('entities.name')}
                placeholder={t('entities.namePlaceholder')}
                required
                error={error}
                {...field}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="type"
            render={({ field, fieldState: { error } }) => (
              <Select
                label={t('entities.type')}
                placeholder={t('entities.typePlaceholder')}
                required
                error={error}
                items={[
                  {
                    value: EntityType.individual,
                    label: t('entities.individual'),
                  },
                  {
                    value: EntityType.organization,
                    label: t('entities.organization'),
                  },
                ]}
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="phone"
            render={({ field, fieldState: { error } }) => (
              <TextInput
                label={t('entities.phone')}
                placeholder={t('entities.phonePlaceholder')}
                error={error}
                {...field}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="email"
            render={({ field, fieldState: { error } }) => (
              <TextInput
                label={t('entities.email')}
                placeholder={t('entities.emailPlaceholder')}
                error={error}
                {...field}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="address"
            render={({ field, fieldState: { error } }) => (
              <TextInput
                label={t('entities.address')}
                placeholder={t('entities.addressPlaceholder')}
                error={error}
                {...field}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="note"
            render={({ field, fieldState: { error } }) => (
              <Textarea
                label={t('entities.note')}
                placeholder={t('entities.notePlaceholder')}
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

export default AddEditEntityDialog;
