import { useState } from 'react';

type UsePageDialogOptions<_TItem> = {
  onCloseCallback?: () => void;
};

export function usePageDialog<TItem>({
  onCloseCallback,
}: UsePageDialogOptions<TItem> = {}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TItem | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);

  const handleAdd = () => {
    setSelectedItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: TItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
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

  return {
    isDialogOpen,
    selectedItem,
    resetTrigger,
    handleAdd,
    handleEdit,
    handleClose,
    handleSaveAndAdd,
  };
}
