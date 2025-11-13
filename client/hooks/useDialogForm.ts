import { useEffect, useRef } from 'react';
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
  onReset?: () => void;
};

export function useDialogForm<TItem, TFormData extends FieldValues>({
  form,
  item,
  isOpen,
  resetTrigger,
  defaultValues,
  getItemValues,
  onSubmit,
  onReset,
}: UseDialogFormOptions<TItem, TFormData>) {
  const { reset, handleSubmit } = form;
  const isEditMode = !!item;
  const previousResetTrigger = useRef(resetTrigger ?? 0);
  const previousIsOpen = useRef(isOpen);
  const previousItemId = useRef<string | null>(null);

  const currentItemId =
    item && typeof item === 'object' && 'id' in item
      ? (item.id as string)
      : null;

  useEffect(() => {
    if (!isOpen) {
      previousIsOpen.current = false;
      return;
    }

    if (item && currentItemId !== previousItemId.current) {
      previousItemId.current = currentItemId;
      reset({
        ...defaultValues,
        ...getItemValues(item),
      });
    } else if (!item && previousIsOpen.current !== isOpen) {
      previousItemId.current = null;
      reset(defaultValues);
    }

    previousIsOpen.current = isOpen;
  }, [item, isOpen, reset, defaultValues, getItemValues, currentItemId]);

  useEffect(() => {
    if (
      resetTrigger !== undefined &&
      resetTrigger > previousResetTrigger.current &&
      !item &&
      isOpen
    ) {
      previousResetTrigger.current = resetTrigger;
      reset(defaultValues);
      onReset?.();
    }
  }, [resetTrigger, item, isOpen, reset, defaultValues, onReset]);

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
