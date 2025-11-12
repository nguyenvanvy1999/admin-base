import type { ReactNode } from 'react';
import {
  Controller,
  type ControllerFieldState,
  type ControllerProps,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

type ZodFormControllerFieldState = Omit<ControllerFieldState, 'error'> & {
  error?: ReactNode;
};

export interface ZodFormFieldRendererProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  field: ControllerRenderProps<TFieldValues, TName>;
  fieldState: ZodFormControllerFieldState;
}

type Props<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = Omit<ControllerProps<TFieldValues, TName>, 'render'> & {
  render: (
    props: ZodFormFieldRendererProps<TFieldValues, TName>,
  ) => React.ReactElement;
};

export function ZodFormController<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ render, ...props }: Props<TFieldValues, TName>) {
  return (
    <Controller
      {...props}
      render={({ field, fieldState }) => {
        const zodFieldState: ZodFormControllerFieldState = {
          ...fieldState,
          error: fieldState.error?.message,
        };
        return render({ field, fieldState: zodFieldState });
      }}
    />
  );
}
