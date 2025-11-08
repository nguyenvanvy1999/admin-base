import type { FieldApi } from '@tanstack/react-form';
import type { InputHTMLAttributes } from 'react';
import Input from './Input';

type FormInputProps<TFormData> = {
  field: FieldApi<TFormData, any, undefined, undefined>;
  label?: string;
  required?: boolean;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
} & Pick<InputHTMLAttributes<HTMLInputElement>, 'min' | 'step'>;

export const FormInput = <TFormData,>({
  field,
  label,
  required = false,
  type = 'text',
  placeholder,
  className = '',
  disabled = false,
  min,
  step,
}: FormInputProps<TFormData>) => {
  return (
    <Input
      type={type}
      name={field.name}
      label={label}
      value={field.state.value ?? ''}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
      error={field.state.meta.errors[0]}
      required={required}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      min={min}
      step={step}
    />
  );
};
