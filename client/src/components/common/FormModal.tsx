import { AppForm, AppFormItem } from '@client/components/common/AppForm';
import { AppModal } from '@client/components/common/AppModal';
import type { FormProps } from 'antd';
import { Button, Form, Space } from 'antd';
import type { ReactNode } from 'react';

export interface FormModalProps<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: T) => Promise<void> | void;
  title?: ReactNode;
  formProps?: Omit<FormProps<T>, 'form' | 'onFinish'>;
  initialValues?: Partial<T>;
  mode?: 'create' | 'edit';
  loading?: boolean;
  okText?: string;
  cancelText?: string;
  children: ReactNode;
  width?: number;
}

/**
 * Modal with form pattern - supports create/edit modes
 */
export function FormModal<
  T extends Record<string, unknown> = Record<string, unknown>,
>({
  open,
  onClose,
  onSubmit,
  title,
  formProps,
  initialValues,
  mode = 'create',
  loading,
  okText,
  cancelText,
  children,
  width = 600,
}: FormModalProps<T>) {
  const [form] = Form.useForm<T>();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
      form.resetFields();
      onClose();
    } catch (error) {
      // Form validation errors are handled by Ant Design
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <AppModal
      open={open}
      onCancel={handleCancel}
      title={title ?? (mode === 'create' ? 'Tạo mới' : 'Chỉnh sửa')}
      width={width}
      confirmLoading={loading}
      footer={
        <Space>
          <Button onClick={handleCancel} disabled={loading}>
            {cancelText ?? 'Hủy'}
          </Button>
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            {okText ?? (mode === 'create' ? 'Tạo' : 'Lưu')}
          </Button>
        </Space>
      }
    >
      <AppForm<T> form={form} initialValues={initialValues} {...formProps}>
        {children}
      </AppForm>
    </AppModal>
  );
}
