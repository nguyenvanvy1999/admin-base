import {
  TextInput as MantineTextInput,
  type TextInputProps,
} from '@mantine/core';
import type { CSSProperties } from 'react';
import { forwardRef } from 'react';

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (props, ref) => {
    const { disabled, value, className, style, ...rest } = props;

    if (disabled) {
      return (
        <div
          className={className}
          style={{
            padding: '0',
            margin: 0,
            ...(style as CSSProperties),
          }}
        >
          {value as any}
        </div>
      );
    }

    return (
      <MantineTextInput
        ref={ref}
        value={value}
        disabled={disabled}
        className={className}
        style={style}
        {...rest}
      />
    );
  },
);

TextInput.displayName = 'TextInput';
