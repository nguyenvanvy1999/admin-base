import { DateInput, type DateInputProps } from '@mantine/dates';

export type DateFieldProps = DateInputProps;

export const DateField = ({ ...others }: DateFieldProps) => {
  return <DateInput {...others} />;
};
