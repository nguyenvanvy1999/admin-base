import { Modal, type ModalProps } from 'antd';
import type { ReactNode } from 'react';

export interface AppModalProps extends ModalProps {
  loading?: boolean;
  confirmLoading?: boolean;
}

export function AppModal({
  centered = true,
  destroyOnHidden = true,
  maskClosable = false,
  width = 520,
  loading,
  confirmLoading,
  ...props
}: AppModalProps) {
  return (
    <Modal
      centered={centered}
      destroyOnHidden={destroyOnHidden}
      maskClosable={maskClosable}
      width={width}
      confirmLoading={confirmLoading ?? loading}
      {...props}
    />
  );
}

export function confirmModal(options: {
  title?: ReactNode;
  content?: ReactNode;
  onOk?: () => void | Promise<void>;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  okType?: 'primary' | 'danger';
}): void {
  Modal.confirm({
    title: options.title ?? 'Xác nhận',
    content: options.content,
    okText: options.okText ?? 'Xác nhận',
    cancelText: options.cancelText ?? 'Hủy',
    okType: options.okType ?? 'primary',
    onOk: options.onOk,
    onCancel: options.onCancel,
    centered: true,
  });
}
