import { Form, type FormProps } from 'antd';
import type { ReactNode } from 'react';

type AppFormProps<T extends object> = Omit<FormProps<T>, 'children'> & {
  children?: ReactNode;
};

export function AppForm<T extends object = Record<string, unknown>>({
  layout = 'vertical',
  children,
  ...rest
}: AppFormProps<T>) {
  return (
    <Form layout={layout} size="large" scrollToFirstError {...rest}>
      {children}
    </Form>
  );
}

export const AppFormItem = Form.Item;
export const AppFormList = Form.List;
