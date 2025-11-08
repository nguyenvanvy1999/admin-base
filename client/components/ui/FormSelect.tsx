import type { FieldApi } from '@tanstack/react-form';
import Select from './Select';

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
  className?: string;
  disabled?: boolean;
};

export const FormSelect = <TFormData,>({
  field,
  label,
  required = false,
  placeholder,
  options,
  className = '',
  disabled = false,
}: FormSelectProps<TFormData>) => {
  return (
    <Select
      name={field.name}
      label={label}
      value={field.state.value ?? ''}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
      error={field.state.meta.errors[0]}
      required={required}
      placeholder={placeholder}
      options={options}
      className={className}
      disabled={disabled}
    />
  );
};
