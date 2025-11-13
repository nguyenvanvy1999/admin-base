import { DateTimePicker, type DateTimePickerProps } from '@mantine/dates';

export type DateTimeFieldProps = DateTimePickerProps;

export const DateTimeField = ({ ...others }: DateTimeFieldProps) => {
  return <DateTimePicker {...others} />;
};
