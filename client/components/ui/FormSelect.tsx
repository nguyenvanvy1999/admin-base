import type { FieldApi } from '@tanstack/react-form';
import { cn } from '../utils';
import { Label } from './label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

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
  const error = field.state.meta.errors[0];

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={field.name}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select
        value={field.state.value ?? ''}
        onValueChange={(value) => field.handleChange(value)}
        disabled={disabled}
      >
        <SelectTrigger
          id={field.name}
          className={cn(
            error && 'border-destructive focus:ring-destructive',
            className,
          )}
          onBlur={field.handleBlur}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
