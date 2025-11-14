import { Switch as MantineSwitch, rem, type SwitchProps } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import type { FieldPath, FieldValues } from 'react-hook-form';
import { ZodFormController } from '../../ZodFormController';
import type { BaseFormFieldProps } from '../types';

export interface SwitchFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends BaseFormFieldProps<TFieldValues, TName>,
    Omit<SwitchProps, 'name' | 'error' | 'checked' | 'onChange'> {}

export function SwitchField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ control, name, ...props }: SwitchFieldProps<TFieldValues, TName>) {
  return (
    <ZodFormController
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => {
        const checked = field.value ?? false;
        const thumbIcon = checked ? (
          <IconCheck
            style={{ width: rem(12), height: rem(12) }}
            color="var(--mantine-color-green-6)"
            stroke={3}
          />
        ) : (
          <IconX
            style={{ width: rem(12), height: rem(12) }}
            color="var(--mantine-color-red-6)"
            stroke={3}
          />
        );

        return (
          <MantineSwitch
            {...props}
            error={error}
            checked={checked}
            thumbIcon={thumbIcon}
            onChange={(e) => field.onChange(e.currentTarget.checked)}
          />
        );
      }}
    />
  );
}
