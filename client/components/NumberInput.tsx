import {
  NumberInput as MantineNumberInput,
  type NumberInputProps,
} from '@mantine/core';
import { forwardRef } from 'react';

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (props, ref) => {
    return <MantineNumberInput {...props} ref={ref} />;
  },
);

NumberInput.displayName = 'NumberInput';
