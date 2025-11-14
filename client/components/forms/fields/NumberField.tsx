import {
  NumberInput as MantineNumberInput,
  type NumberInputProps,
} from '@mantine/core';
import type { FieldPath, FieldValues } from 'react-hook-form';
import { ZodFormController } from '../../ZodFormController';
import type { BaseFormFieldProps } from '../types';

export interface NumberFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends BaseFormFieldProps<TFieldValues, TName>,
    Omit<NumberInputProps, 'name' | 'error' | 'value' | 'onChange'> {
  decimalScale?: number;
  thousandSeparator?: string;
}

export function NumberField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  decimalScale = 2,
  thousandSeparator = ',',
  ...props
}: NumberFieldProps<TFieldValues, TName>) {
  return (
    <ZodFormController
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <MantineNumberInput
          {...props}
          {...field}
          error={error}
          decimalScale={decimalScale}
          thousandSeparator={thousandSeparator}
          value={field.value ?? 0}
          onChange={(value) => field.onChange(Number(value) || 0)}
        />
      )}
    />
  );
}
