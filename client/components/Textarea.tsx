import { Textarea as MantineTextarea, type TextareaProps } from '@mantine/core';
import { forwardRef } from 'react';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (props, ref) => {
    return <MantineTextarea {...props} ref={ref} />;
  },
);

Textarea.displayName = 'Textarea';
