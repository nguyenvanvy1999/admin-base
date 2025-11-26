import { Modal, type ModalProps } from 'antd';

export function AppModal(props: ModalProps) {
  return (
    <Modal
      centered
      destroyOnClose
      maskClosable={false}
      width={props.width ?? 520}
      {...props}
    />
  );
}
