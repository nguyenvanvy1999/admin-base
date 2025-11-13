import { useEffect } from 'react';
import type { FieldValues } from 'react-hook-form';
import type { UseZodFormReturn } from './useZodForm';

type UseDialogFormOptions<TItem, TFormData extends FieldValues> = {
  form: UseZodFormReturn<TFormData>;
  item: TItem | null;
  isOpen: boolean;
  resetTrigger?: number;
  defaultValues: TFormData;
  getItemValues: (item: TItem) => Partial<TFormData>;
  onSubmit: (data: TFormData, saveAndAdd?: boolean) => void;
};

export function useDialogForm<TItem, TFormData extends FieldValues>({
  form,
  item,
  isOpen,
  resetTrigger,
  defaultValues,
  getItemValues,
  onSubmit,
}: UseDialogFormOptions<TItem, TFormData>) {
  const { reset, handleSubmit } = form;
  const isEditMode = !!item;

  useEffect(() => {
    if (item) {
      reset({
        ...defaultValues,
        ...getItemValues(item),
      });
    } else {
      reset(defaultValues);
    }
  }, [item, isOpen, reset, defaultValues, getItemValues]);

  useEffect(() => {
    if (resetTrigger && resetTrigger > 0 && !item && isOpen) {
      reset(defaultValues);
    }
  }, [resetTrigger, item, isOpen, reset, defaultValues]);

  const onSubmitForm = handleSubmit((data) => {
    onSubmit(data, false);
  });

  const onSubmitFormAndAdd = handleSubmit((data) => {
    onSubmit(data, true);
  });

  return {
    isEditMode,
    onSubmitForm,
    onSubmitFormAndAdd,
  };
}
