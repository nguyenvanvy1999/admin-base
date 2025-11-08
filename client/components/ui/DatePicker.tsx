import type { InputHTMLAttributes } from 'react';
import Input from './Input';

type DatePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  error?: string;
  required?: boolean;
};

const DatePicker = ({
  label,
  error,
  required = false,
  className = '',
  ...props
}: DatePickerProps) => {
  return (
    <Input
      type="date"
      label={label}
      error={error}
      required={required}
      className={className}
      {...props}
    />
  );
};

export default DatePicker;
