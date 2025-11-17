import { useZodForm } from '@client/hooks/useZodForm';
import { Modal, type ModalProps, Stack } from '@mantine/core';
import { type ReactNode, useEffect } from 'react';
import type {
  Control,
  FieldValues,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import type { ZodType } from 'zod';
import { DialogFooter } from './base/DialogFooter';

export interface CRUDDialogProps<TData, TFormValue extends FieldValues>
  extends Omit<
    ModalProps,
    'opened' | 'onClose' | 'title' | 'children' | 'onSubmit'
  > {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;

  /**
   * Callback when dialog is closed
   */
  onClose: () => void;

  /**
   * Item to edit (null for add mode)
   */
  item: TData | null;

  /**
   * Callback when form is submitted
   * @param data - Form data
   * @param saveAndAdd - Whether to save and add another item
   */
  onSubmit: (data: TFormValue, saveAndAdd?: boolean) => void;

  /**
   * Whether the form is submitting
   */
  isLoading?: boolean;

  /**
   * Dialog title configuration
   */
  title: {
    add: string;
    edit: string;
  };

  /**
   * Render function for form fields
   */
  children: (props: {
    control: Control<TFormValue>;
    watch: UseFormWatch<TFormValue>;
    setValue: UseFormSetValue<TFormValue>;
    isEditMode: boolean;
  }) => ReactNode;

  /**
   * Zod schema for form validation
   */
  schema: ZodType<TFormValue>;

  /**
   * Default values for form
   */
  defaultValues: TFormValue;

  /**
   * Function to convert item to form values (for edit mode)
   */
  getFormValues?: (item: TData) => TFormValue;

  /**
   * Whether to show "Save and Add" button
   * @default true
   */
  showSaveAndAdd?: boolean;

  /**
   * Custom save button label
   */
  saveLabel?: string;

  /**
   * Custom add button label
   */
  addLabel?: string;

  /**
   * Modal size
   * @default 'md'
   */
  size?: ModalProps['size'];
}

/**
 * Generic CRUD Dialog Component
 *
 * A reusable dialog component for Create/Update operations with form validation.
 *
 * @example
 * ```tsx
 * <CRUDDialog
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   item={account}
 *   onSubmit={handleSubmit}
 *   isLoading={isLoading}
 *   title={{ add: 'Add Account', edit: 'Edit Account' }}
 *   schema={accountSchema}
 *   defaultValues={defaultAccountValues}
 *   getFormValues={(account) => ({
 *     name: account.name,
 *     type: account.type,
 *   })}
 * >
 *   {({ control, watch, isEditMode }) => (
 *     <>
 *       <TextField control={control} name="name" label="Name" />
 *       <SelectField control={control} name="type" label="Type" />
 *     </>
 *   )}
 * </CRUDDialog>
 * ```
 */
export function CRUDDialog<TData, TFormValue extends FieldValues>({
  isOpen,
  onClose,
  item,
  onSubmit,
  isLoading = false,
  title,
  children,
  schema,
  defaultValues,
  getFormValues,
  showSaveAndAdd = true,
  saveLabel,
  addLabel,
  size = 'md',
  ...modalProps
}: CRUDDialogProps<TData, TFormValue>) {
  const isEditMode = !!item;

  const { control, handleSubmit, reset, watch, setValue } = useZodForm({
    zod: schema,
    defaultValues: defaultValues as any,
  });

  // Reset form when dialog opens/closes or item changes
  useEffect(() => {
    if (item && getFormValues) {
      reset(getFormValues(item));
    } else {
      reset(defaultValues);
    }
  }, [item, isOpen, reset, defaultValues, getFormValues]);

  const onSubmitForm = handleSubmit((data) => {
    onSubmit(data, false);
  });

  const onSaveAndAdd = handleSubmit((data) => {
    onSubmit(data, true);
  });

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={isEditMode ? title.edit : title.add}
      size={size}
      centered
      {...modalProps}
    >
      <form onSubmit={onSubmitForm}>
        <Stack gap="md">
          {children({ control, watch, setValue, isEditMode })}

          <DialogFooter
            isEditMode={isEditMode}
            isLoading={isLoading}
            onCancel={onClose}
            onSave={onSubmitForm}
            onSaveAndAdd={showSaveAndAdd ? onSaveAndAdd : undefined}
            saveLabel={saveLabel}
            addLabel={addLabel}
            showSaveAndAdd={showSaveAndAdd}
          />
        </Stack>
      </form>
    </Modal>
  );
}
