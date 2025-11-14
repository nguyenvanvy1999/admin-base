import {
  Select as MantineSelect,
  type SelectProps as MantineSelectProps,
} from '@mantine/core';
import type { FieldPath, FieldValues } from 'react-hook-form';
import { ZodFormController } from '../../ZodFormController';
import type { BaseFormFieldProps } from '../types';

export interface SelectFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends BaseFormFieldProps<TFieldValues, TName>,
    Omit<MantineSelectProps, 'name' | 'error' | 'value' | 'onChange' | 'data'> {
  data: Array<{ value: string; label: string }>;
}

export function SelectField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ control, name, data, ...props }: SelectFieldProps<TFieldValues, TName>) {
  return (
    <ZodFormController
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <MantineSelect
          {...props}
          data={data}
          error={error}
          value={field.value ?? undefined}
          onChange={(value) => field.onChange(value ?? null)}
        />
      )}
    />
  );
}
