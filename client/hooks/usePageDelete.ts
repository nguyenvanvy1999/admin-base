import { useState } from 'react';

type UsePageDeleteOptions<_TItem> = {
  onDeleteCallback?: () => void;
  onDeleteManyCallback?: () => void;
};

export function usePageDelete<TItem extends { id: string }>({
  onDeleteCallback,
  onDeleteManyCallback,
}: UsePageDeleteOptions<TItem> = {}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TItem | null>(null);
  const [isDeleteManyDialogOpen, setIsDeleteManyDialogOpen] = useState(false);
  const [itemsToDeleteMany, setItemsToDeleteMany] = useState<string[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<TItem[]>([]);

  const handleDelete = (item: TItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleConfirmDelete = async (
    deleteFn: (id: string) => Promise<unknown>,
  ) => {
    if (itemToDelete) {
      try {
        await deleteFn(itemToDelete.id);
        handleDeleteDialogClose();
        onDeleteCallback?.();
      } catch {
        // Error is already handled by mutation's onError callback
      }
    }
  };

  const handleDeleteMany = (ids: string[]) => {
    setItemsToDeleteMany(ids);
    setIsDeleteManyDialogOpen(true);
  };

  const handleDeleteManyDialogClose = () => {
    setIsDeleteManyDialogOpen(false);
    setItemsToDeleteMany([]);
    setSelectedRecords([]);
  };

  const handleConfirmDeleteMany = async (
    deleteManyFn: (ids: string[]) => Promise<unknown>,
  ) => {
    if (itemsToDeleteMany.length > 0) {
      try {
        await deleteManyFn(itemsToDeleteMany);
        handleDeleteManyDialogClose();
        onDeleteManyCallback?.();
      } catch {
        // Error is already handled by mutation's onError callback
      }
    }
  };

  return {
    isDeleteDialogOpen,
    itemToDelete,
    handleDelete,
    handleDeleteDialogClose,
    handleConfirmDelete,
    isDeleteManyDialogOpen,
    itemsToDeleteMany,
    selectedRecords,
    setSelectedRecords,
    handleDeleteMany,
    handleDeleteManyDialogClose,
    handleConfirmDeleteMany,
  };
}
