import { Button, Group, Modal, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

type DeleteConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  title: string;
  message: string;
  itemName: string;
};

export const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title,
  message,
  itemName,
}: DeleteConfirmationModalProps) => {
  const { t } = useTranslation();

  return (
    <Modal opened={isOpen} onClose={onClose} title={title} size="md">
      <Text mb="md">
        {message}
        <br />
        <strong>{itemName}</strong>
      </Text>
      <Group justify="flex-end" mt="md">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button color="red" onClick={onConfirm} disabled={isLoading}>
          {isLoading
            ? t('common.deleting', { defaultValue: 'Deleting...' })
            : t('common.delete')}
        </Button>
      </Group>
    </Modal>
  );
};
