import { DateTimePicker, type DateTimePickerProps } from '@mantine/dates';
import type { FieldPath, FieldValues } from 'react-hook-form';
import { ZodFormController } from '../../ZodFormController';
import type { BaseFormFieldProps } from '../types';

export interface DateTimeFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends BaseFormFieldProps<TFieldValues, TName>,
    Omit<DateTimePickerProps, 'name' | 'error' | 'value' | 'onChange'> {}

export function DateTimeField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ control, name, ...props }: DateTimeFieldProps<TFieldValues, TName>) {
  return (
    <ZodFormController
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => {
        const fieldValue = field.value;
        let dateValue: Date | null = null;

        if (fieldValue) {
          if (
            fieldValue &&
            typeof fieldValue === 'object' &&
            'getTime' in fieldValue
          ) {
            dateValue = fieldValue as Date;
          } else if (typeof fieldValue === 'string') {
            dateValue = new Date(fieldValue);
          }
        }

        return (
          <DateTimePicker
            {...props}
            error={error}
            value={dateValue}
            onChange={(value) => {
              if (value) {
                let date: Date | null = null;
                if (
                  value &&
                  typeof value === 'object' &&
                  'getTime' in value &&
                  typeof (value as Date).getTime === 'function'
                ) {
                  date = value as Date;
                } else if (typeof value === 'string') {
                  date = new Date(value);
                }
                field.onChange(date ? date.toISOString() : null);
              } else {
                field.onChange(null);
              }
            }}
          />
        );
      }}
    />
  );
}
