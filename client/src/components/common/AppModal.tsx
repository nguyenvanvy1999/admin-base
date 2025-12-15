import { Modal, type ModalProps } from 'antd';
import type { ReactNode } from 'react';

export interface AppModalProps extends ModalProps {}

export function AppModal({
  centered = true,
  destroyOnHidden = true,
  maskClosable = false,
  width = 520,
  ...props
}: AppModalProps) {
  return (
    <Modal
      centered={centered}
      destroyOnHidden={destroyOnHidden}
      maskClosable={maskClosable}
      width={width}
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
