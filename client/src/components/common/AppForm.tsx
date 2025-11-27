import { Form, type FormProps } from 'antd';
import type { ReactNode } from 'react';

export interface AppFormProps<T extends object = Record<string, unknown>>
  extends Omit<FormProps<T>, 'children'> {
  children?: ReactNode;
  loading?: boolean;
}

export function AppForm<T extends object = Record<string, unknown>>({
  layout = 'vertical',
  size = 'large',
  children,
  loading,
  ...rest
}: AppFormProps<T>) {
  return (
    <Form<T>
      layout={layout}
      size={size}
      scrollToFirstError
      disabled={loading}
      {...rest}
    >
      {children}
    </Form>
  );
}

export const AppFormItem = Form.Item;
export const AppFormList = Form.List;
export const AppFormProvider = Form.Provider;
