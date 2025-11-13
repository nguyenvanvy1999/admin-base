import { useState } from 'react';

type UsePageDialogOptions<TItem> = {
  onCloseCallback?: () => void;
  onOpenCallback?: () => void;
  onAddCallback?: () => void;
  onEditCallback?: (item: TItem) => void;
  onSuccessCallback?: (item: TItem | null) => void;
  onErrorCallback?: (error: unknown) => void;
};

export function usePageDialog<TItem>({
  onCloseCallback,
  onOpenCallback,
  onAddCallback,
  onEditCallback,
  onSuccessCallback,
  onErrorCallback,
}: UsePageDialogOptions<TItem> = {}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TItem | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);

  const handleAdd = () => {
    setSelectedItem(null);
    setIsDialogOpen(true);
    onAddCallback?.();
    onOpenCallback?.();
  };

  const handleEdit = (item: TItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
    onEditCallback?.(item);
    onOpenCallback?.();
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedItem(null);
    onCloseCallback?.();
  };

  const handleSaveAndAdd = () => {
    setSelectedItem(null);
    setResetTrigger((prev) => prev + 1);
  };

  const handleSuccess = (item: TItem | null = null) => {
    onSuccessCallback?.(item);
  };

  const handleError = (error: unknown) => {
    onErrorCallback?.(error);
  };

  return {
    isDialogOpen,
    selectedItem,
    resetTrigger,
    handleAdd,
    handleEdit,
    handleClose,
    handleSaveAndAdd,
    handleSuccess,
    handleError,
  };
}
