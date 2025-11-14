import { TextInput, type TextInputProps } from '@mantine/core';
import type { FieldPath, FieldValues } from 'react-hook-form';
import { ZodFormController } from '../../ZodFormController';
import type { BaseFormFieldProps } from '../types';

export interface TextFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends BaseFormFieldProps<TFieldValues, TName>,
    Omit<TextInputProps, 'name' | 'error'> {}

export function TextField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ control, name, ...props }: TextFieldProps<TFieldValues, TName>) {
  return (
    <ZodFormController
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <TextInput {...props} {...field} error={error} />
      )}
    />
  );
}
