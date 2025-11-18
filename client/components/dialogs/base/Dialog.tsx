import { Modal, type ModalProps, Stack } from '@mantine/core';
import type { ReactNode } from 'react';
import { DialogFooter, type DialogFooterProps } from './DialogFooter';

export interface BaseDialogProps extends Omit<ModalProps, 'children'> {
  children: ReactNode;
  footer?: ReactNode | DialogFooterProps;
  isLoading?: boolean;
  isEditMode?: boolean;
  onSave?: (e?: React.FormEvent) => void;
  onSaveAndAdd?: (e?: React.FormEvent) => void;
  showSaveAndAdd?: boolean;
}

export function BaseDialog({
  children,
  footer,
  isLoading = false,
  isEditMode = false,
  onSave,
  onSaveAndAdd,
  showSaveAndAdd = true,
  ...modalProps
}: BaseDialogProps) {
  const renderFooter = () => {
    if (!footer) return null;

    if (typeof footer === 'object' && 'onCancel' in footer) {
      const {
        isEditMode: footerIsEditMode,
        isLoading: footerIsLoading,
        onSave: footerOnSave,
        onSaveAndAdd: footerOnSaveAndAdd,
        showSaveAndAdd: footerShowSaveAndAdd,
        ...restFooterProps
      } = footer;
      return (
        <DialogFooter
          {...restFooterProps}
          isEditMode={isEditMode ?? footerIsEditMode}
          isLoading={isLoading ?? footerIsLoading}
          onSave={
            onSave ||
            footerOnSave ||
            (() => {
              /* noop */
            })
          }
          onSaveAndAdd={onSaveAndAdd || footerOnSaveAndAdd}
          showSaveAndAdd={showSaveAndAdd ?? footerShowSaveAndAdd}
        />
      );
    }

    return footer;
  };

  return (
    <Modal {...modalProps} centered>
      <form onSubmit={onSave}>
        <Stack gap="md">
          {children}
          {renderFooter()}
        </Stack>
      </form>
    </Modal>
  );
}
