import { ProForm, type ProFormProps } from '@ant-design/pro-components';
import { Button, Form, Space } from 'antd';
import type { ReactNode } from 'react';
import { AppModal } from 'src/components/common/AppModal';

export interface FormModalProps<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: T) => Promise<void> | void;
  title?: ReactNode;
  formProps?: Omit<ProFormProps<T>, 'form' | 'onFinish' | 'submitter'>;
  initialValues?: Partial<T>;
  mode?: 'create' | 'edit';
  loading?: boolean;
  okText?: string;
  cancelText?: string;
  children: ReactNode;
  width?: number;
}

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
      console.error(error);
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
      <ProForm<T>
        form={form}
        initialValues={initialValues}
        disabled={loading}
        submitter={false}
        {...formProps}
      >
        {children}
      </ProForm>
    </AppModal>
  );
}
