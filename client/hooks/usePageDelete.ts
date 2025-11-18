import { useState } from 'react';

type UsePageDeleteOptions<TItem extends { id: string }> = {
  onDeleteCallback?: (item: TItem) => void;
  onDeleteManyCallback?: (ids: string[]) => void;
  onDeleteSuccessCallback?: (item: TItem) => void;
  onDeleteManySuccessCallback?: (ids: string[]) => void;
  onDeleteErrorCallback?: (error: unknown, item: TItem) => void;
  onDeleteManyErrorCallback?: (error: unknown, ids: string[]) => void;
};

export function usePageDelete<TItem extends { id: string }>({
  onDeleteCallback,
  onDeleteManyCallback,
  onDeleteSuccessCallback,
  onDeleteManySuccessCallback,
  onDeleteErrorCallback,
  onDeleteManyErrorCallback,
}: UsePageDeleteOptions<TItem> = {}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TItem | null>(null);
  const [isDeleteManyDialogOpen, setIsDeleteManyDialogOpen] = useState(false);
  const [itemsToDeleteMany, setItemsToDeleteMany] = useState<string[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<TItem[]>([]);

  const handleDelete = (item: TItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
    onDeleteCallback?.(item);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleConfirmDelete = async (
    deleteManyFn: (ids: string[]) => Promise<unknown>,
  ) => {
    if (!itemToDelete) return;

    try {
      await deleteManyFn([itemToDelete.id]);
      const deletedItem = itemToDelete;
      handleDeleteDialogClose();
      onDeleteSuccessCallback?.(deletedItem);
    } catch (error) {
      onDeleteErrorCallback?.(error, itemToDelete);
    }
  };

  const handleDeleteMany = (ids: string[]) => {
    setItemsToDeleteMany(ids);
    setIsDeleteManyDialogOpen(true);
    onDeleteManyCallback?.(ids);
  };

  const handleDeleteManyDialogClose = () => {
    setIsDeleteManyDialogOpen(false);
    setItemsToDeleteMany([]);
    setSelectedRecords([]);
  };

  const handleConfirmDeleteMany = async (
    deleteManyFn: (ids: string[]) => Promise<unknown>,
  ) => {
    if (itemsToDeleteMany.length === 0) return;

    const idsToDelete = [...itemsToDeleteMany];
    try {
      await deleteManyFn(idsToDelete);
      handleDeleteManyDialogClose();
      onDeleteManySuccessCallback?.(idsToDelete);
    } catch (error) {
      onDeleteManyErrorCallback?.(error, idsToDelete);
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
