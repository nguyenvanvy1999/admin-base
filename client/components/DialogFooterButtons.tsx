import { Button, Group } from '@mantine/core';
import { useTranslation } from 'react-i18next';

type DialogFooterButtonsProps = {
  isEditMode: boolean;
  isLoading?: boolean;
  onCancel: () => void;
  onSave: (e?: React.FormEvent) => void;
  onSaveAndAdd?: (e?: React.FormEvent) => void;
  saveLabel?: string;
  addLabel?: string;
  showSaveAndAdd?: boolean;
};

export const DialogFooterButtons = ({
  isEditMode,
  isLoading = false,
  onCancel,
  onSave,
  onSaveAndAdd,
  saveLabel,
  addLabel,
  showSaveAndAdd = true,
}: DialogFooterButtonsProps) => {
  const { t } = useTranslation();

  const handleSaveAndAdd = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (onSaveAndAdd) {
      onSaveAndAdd(e);
    }
  };

  return (
    <Group justify="flex-end" mt="md">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isLoading}
      >
        {t('common.cancel')}
      </Button>
      {!isEditMode && showSaveAndAdd && onSaveAndAdd && (
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveAndAdd}
          disabled={isLoading}
        >
          {t('common.saveAndAdd')}
        </Button>
      )}
      <Button type="submit" disabled={isLoading} onClick={onSave}>
        {isLoading
          ? t('common.saving', { defaultValue: 'Saving...' })
          : isEditMode
            ? saveLabel || t('common.save')
            : addLabel || t('common.add')}
      </Button>
    </Group>
  );
};
