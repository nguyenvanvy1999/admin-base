import { Checkbox, type CheckboxProps } from '@mantine/core';
import type { FieldPath, FieldValues } from 'react-hook-form';
import { ZodFormController } from '../../ZodFormController';
import type { BaseFormFieldProps } from '../types';

export interface CheckboxFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends BaseFormFieldProps<TFieldValues, TName>,
    Omit<CheckboxProps, 'name' | 'error' | 'checked' | 'onChange'> {}

export function CheckboxField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ control, name, ...props }: CheckboxFieldProps<TFieldValues, TName>) {
  return (
    <ZodFormController
      control={control}
      name={name}
      render={({
        field: { value, onChange, ...field },
        fieldState: { error },
      }) => (
        <Checkbox
          {...props}
          {...field}
          checked={value ?? false}
          onChange={(e) => onChange(e.currentTarget.checked)}
          error={error}
        />
      )}
    />
  );
}
