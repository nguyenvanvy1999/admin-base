import { Box, type BoxProps } from '@mantine/core';
import {
  type EventHandler,
  type FormEvent,
  type ForwardedRef,
  forwardRef,
  type PropsWithChildren,
  useImperativeHandle,
  useRef,
} from 'react';

export interface FormComponentRef {
  submit: (
    handlers: EventHandler<FormEvent> | EventHandler<FormEvent>[],
  ) => void;
}

interface Props extends BoxProps, PropsWithChildren {}

function FormComponentInner(props: Props, ref: ForwardedRef<FormComponentRef>) {
  const formRef = useRef<HTMLFormElement>(null);

  useImperativeHandle(ref, () => ({
    submit: (handlers: EventHandler<FormEvent> | EventHandler<FormEvent>[]) => {
      if (formRef.current) {
        const handler = Array.isArray(handlers) ? handlers[0] : handlers;
        formRef.current.requestSubmit();
        if (handler) {
          const syntheticEvent = new Event('submit', {
            bubbles: true,
            cancelable: true,
          }) as unknown as FormEvent<HTMLFormElement>;
          handler(syntheticEvent);
        }
      }
    },
  }));

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Box {...props} component="form" ref={formRef} onSubmit={handleSubmit}>
      {props.children}
    </Box>
  );
}

export const FormComponent = forwardRef(FormComponentInner) as <
  T extends FormComponentRef = FormComponentRef,
>(
  props: Props & { ref?: ForwardedRef<T> },
) => ReturnType<typeof FormComponentInner>;
