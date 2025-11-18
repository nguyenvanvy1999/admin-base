import { TextInput } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import {
  type EventResponse,
  type IUpsertEventDto,
  UpsertEventDto,
} from '@server/dto/event.dto';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ZodFormController } from '../ZodFormController';
import { CRUDDialog } from './CRUDDialog';

const schema = UpsertEventDto.extend({
  name: z.string().min(1, 'events.nameRequired'),
  startAt: z.string().min(1, 'events.startAtRequired'),
});

type FormValue = z.infer<typeof schema>;

type AddEditEventDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  event: EventResponse | null;
  onSubmit: (data: IUpsertEventDto, saveAndAdd?: boolean) => void;
  isLoading?: boolean;
  resetTrigger?: number;
};

const AddEditEventDialog = ({
  isOpen,
  onClose,
  event,
  onSubmit,
  isLoading = false,
}: AddEditEventDialogProps) => {
  const { t } = useTranslation();

  const defaultValues: FormValue = {
    name: '',
    startAt: new Date().toISOString(),
    endAt: undefined,
  };

  const getFormValues = (event: EventResponse): FormValue => ({
    id: event.id,
    name: event.name,
    startAt: event.startAt,
    endAt: event.endAt || undefined,
  });

  const handleSubmit = (data: FormValue, saveAndAdd?: boolean) => {
    const isEditMode = !!event;

    const submitData: IUpsertEventDto = {
      name: data.name.trim(),
      startAt: data.startAt,
    };

    if (isEditMode && event) {
      submitData.id = event.id;
    }

    if (data.endAt && data.endAt.trim() !== '') {
      submitData.endAt = data.endAt;
    }

    onSubmit(submitData, saveAndAdd);
  };

  return (
    <CRUDDialog
      isOpen={isOpen}
      onClose={onClose}
      item={event}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      title={{
        add: t('events.addEvent'),
        edit: t('events.editEvent'),
      }}
      schema={schema}
      defaultValues={defaultValues}
      getFormValues={getFormValues}
      size="md"
    >
      {({ control, watch }) => {
        const startAtValue = watch('startAt');

        return (
          <>
            <ZodFormController
              control={control}
              name="name"
              render={({ field, fieldState: { error } }) => (
                <TextInput
                  label={t('events.name')}
                  placeholder={t('events.namePlaceholder')}
                  required
                  error={error}
                  {...field}
                />
              )}
            />

            <ZodFormController
              control={control}
              name="startAt"
              render={({ field, fieldState: { error } }) => (
                <DateTimePicker
                  label={t('events.startAt')}
                  placeholder={t('events.startAtPlaceholder')}
                  required
                  error={error}
                  value={field.value ? new Date(field.value) : null}
                  onChange={(value: Date | string | null) => {
                    if (value instanceof Date) {
                      field.onChange(value.toISOString());
                    } else if (typeof value === 'string') {
                      field.onChange(value);
                    } else {
                      field.onChange('');
                    }
                  }}
                  onBlur={field.onBlur}
                />
              )}
            />

            <ZodFormController
              control={control}
              name="endAt"
              render={({ field, fieldState: { error } }) => (
                <DateTimePicker
                  label={t('events.endAt')}
                  placeholder={t('events.endAtPlaceholder')}
                  error={error}
                  value={field.value ? new Date(field.value) : null}
                  onChange={(value: Date | string | null) => {
                    if (value instanceof Date) {
                      field.onChange(value.toISOString());
                    } else if (typeof value === 'string') {
                      field.onChange(value);
                    } else {
                      field.onChange(undefined);
                    }
                  }}
                  onBlur={field.onBlur}
                  minDate={startAtValue ? new Date(startAtValue) : new Date()}
                />
              )}
            />
          </>
        );
      }}
    </CRUDDialog>
  );
};

export default AddEditEventDialog;
