import type { FieldApi } from '@tanstack/react-form';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../utils';
import { Input } from './Input';
import { Label } from './label';

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
  const error = field.state.meta.errors[0];

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={field.name}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Input
        id={field.name}
        type={type}
        value={field.state.value ?? ''}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        step={step}
        className={cn(
          error && 'border-destructive focus-visible:ring-destructive',
          className,
        )}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
