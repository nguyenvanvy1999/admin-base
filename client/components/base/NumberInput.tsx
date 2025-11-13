import {
  NumberInput as MantineNumberInput,
  type NumberInputProps,
} from '@mantine/core';

export interface NumberInputFieldProps extends NumberInputProps {
  decimalScale?: number;
  thousandSeparator?: string;
}

export const NumberInput = ({
  decimalScale = 2,
  thousandSeparator = ',',
  ...others
}: NumberInputFieldProps) => {
  return (
    <MantineNumberInput
      decimalScale={decimalScale}
      thousandSeparator={thousandSeparator}
      {...others}
    />
  );
};
