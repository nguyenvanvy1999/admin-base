import { Select } from '@mantine/core';
import type { FieldApi } from '@tanstack/react-form';

type SelectOption = {
  value: string;
  label: string;
};

type FormSelectProps<TFormData> = {
  field: FieldApi<TFormData, any, undefined, undefined>;
  label?: string;
  required?: boolean;
  placeholder?: string;
  options: SelectOption[];
  disabled?: boolean;
};

export const FormSelect = <TFormData,>({
  field,
  label,
  required = false,
  placeholder,
  options,
  disabled = false,
}: FormSelectProps<TFormData>) => {
  const error = field.state.meta.errors[0];

  return (
    <Select
      label={label}
      required={required}
      placeholder={placeholder}
      data={options}
      value={field.state.value ?? null}
      onChange={(value) => field.handleChange(value ?? '')}
      onBlur={field.handleBlur}
      disabled={disabled}
      error={error}
    />
  );
};
