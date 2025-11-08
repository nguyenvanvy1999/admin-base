import { TextInput } from '@mantine/core';
import type { FieldApi } from '@tanstack/react-form';
import type { InputHTMLAttributes } from 'react';

type FormTextInputProps<TFormData> = {
  field: FieldApi<TFormData, any, undefined, undefined>;
  label?: string;
  required?: boolean;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  placeholder?: string;
  disabled?: boolean;
} & Pick<InputHTMLAttributes<HTMLInputElement>, 'min' | 'step'>;

export const FormTextInput = <TFormData,>({
  field,
  label,
  required = false,
  type = 'text',
  placeholder,
  disabled = false,
  min,
  step,
}: FormTextInputProps<TFormData>) => {
  const error = field.state.meta.errors[0];

  return (
    <TextInput
      label={label}
      required={required}
      type={type}
      value={field.state.value ?? ''}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      min={min}
      step={step}
    />
  );
};
