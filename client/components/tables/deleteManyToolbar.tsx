import { Button } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export type DeleteManyToolbarProps<T extends { id: string }> = {
  selectedRecords: T[];
  onDeleteMany: (ids: string[]) => void;
  isLoading?: boolean;
};

export function DeleteManyToolbar<T extends { id: string }>({
  selectedRecords,
  onDeleteMany,
  isLoading = false,
}: DeleteManyToolbarProps<T>) {
  const { t } = useTranslation();
  const selectedCount = selectedRecords?.length || 0;

  if (selectedCount === 0) {
    return null;
  }

  const handleDelete = () => {
    const selectedIds = selectedRecords.map((r) => r.id);
    if (selectedIds.length > 0) {
      onDeleteMany(selectedIds);
    }
  };

  return (
    <Button
      color="red"
      variant="filled"
      leftSection={<IconTrash size={16} />}
      onClick={handleDelete}
      disabled={isLoading}
    >
      {t('common.deleteSelected', {
        defaultValue: `Delete ${selectedCount}`,
        count: selectedCount,
      })}
    </Button>
  );
}
