import { useZodForm } from '@client/hooks/useZodForm';
import { Modal, Stack, TextInput } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import {
  type EventResponse,
  type IUpsertEventDto,
  UpsertEventDto,
} from '@server/dto/event.dto';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { DialogFooterButtons } from './DialogFooterButtons';
import { ZodFormController } from './ZodFormController';

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
  resetTrigger,
}: AddEditEventDialogProps) => {
  const { t } = useTranslation();
  const isEditMode = !!event;

  const defaultValues: FormValue = {
    name: '',
    startAt: new Date().toISOString(),
    endAt: undefined,
  };

  const { control, handleSubmit, reset, watch } = useZodForm({
    zod: schema,
    defaultValues,
  });

  const startAtValue = watch('startAt');

  useEffect(() => {
    if (event) {
      reset({
        id: event.id,
        name: event.name,
        startAt: event.startAt,
        endAt: event.endAt || undefined,
      });
    } else {
      reset(defaultValues);
    }
  }, [event, isOpen, reset]);

  useEffect(() => {
    if (resetTrigger && resetTrigger > 0 && !event && isOpen) {
      reset(defaultValues);
    }
  }, [resetTrigger, event, isOpen, reset]);

  const onSubmitForm = handleSubmit((data) => {
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

    onSubmit(submitData, false);
  });

  const onSubmitFormAndAdd = handleSubmit((data) => {
    const submitData: IUpsertEventDto = {
      name: data.name.trim(),
      startAt: data.startAt,
    };

    if (data.endAt && data.endAt.trim() !== '') {
      submitData.endAt = data.endAt;
    }

    onSubmit(submitData, true);
  });

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={isEditMode ? t('events.editEvent') : t('events.addEvent')}
      size="md"
    >
      <form onSubmit={onSubmitForm}>
        <Stack gap="md">
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

          <DialogFooterButtons
            isEditMode={isEditMode}
            isLoading={isLoading}
            onCancel={onClose}
            onSave={onSubmitForm}
            onSaveAndAdd={onSubmitFormAndAdd}
          />
        </Stack>
      </form>
    </Modal>
  );
};

export default AddEditEventDialog;
