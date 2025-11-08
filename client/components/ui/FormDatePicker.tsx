import { DatePickerInput } from '@mantine/dates';
import type { FieldApi } from '@tanstack/react-form';

type FormDatePickerProps<TFormData> = {
  field: FieldApi<TFormData, any, undefined, undefined>;
  label?: string;
  required?: boolean;
  disabled?: boolean;
};

export const FormDatePicker = <TFormData,>({
  field,
  label,
  required = false,
  disabled = false,
}: FormDatePickerProps<TFormData>) => {
  const error = field.state.meta.errors[0];

  const value = field.state.value ? new Date(field.state.value) : null;

  return (
    <DatePickerInput
      label={label}
      required={required}
      value={value}
      onChange={(date) => {
        field.handleChange(date ? date.toISOString().split('T')[0] : '');
      }}
      onBlur={field.handleBlur}
      disabled={disabled}
      error={error}
    />
  );
};
