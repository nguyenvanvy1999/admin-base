import type { FieldApi } from '@tanstack/react-form';
import { cn } from '../utils';
import { Input } from './Input';
import { Label } from './label';

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
        type="date"
        value={value}
        onChange={(e) => {
          const dateValue = e.target.value;
          field.handleChange(dateValue ? dateValue : '');
        }}
        onBlur={field.handleBlur}
        disabled={disabled}
        className={cn(
          error && 'border-destructive focus-visible:ring-destructive',
          className,
        )}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
