import type { FieldApi } from '@tanstack/react-form';
import DatePicker from './DatePicker';

type FormDatePickerProps<TFormData> = {
  field: FieldApi<TFormData, any, undefined, undefined>;
  label?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
};

export const FormDatePicker = <TFormData,>({
  field,
  label,
  required = false,
  className = '',
  disabled = false,
}: FormDatePickerProps<TFormData>) => {
  const value =
    field.state.value instanceof Date
      ? field.state.value.toISOString().split('T')[0]
      : (field.state.value ?? '');

  return (
    <DatePicker
      name={field.name}
      label={label}
      value={value}
      onChange={(e) => {
        const dateValue = e.target.value;
        field.handleChange(dateValue ? dateValue : '');
      }}
      onBlur={field.handleBlur}
      error={field.state.meta.errors[0]}
      required={required}
      className={className}
      disabled={disabled}
    />
  );
};
