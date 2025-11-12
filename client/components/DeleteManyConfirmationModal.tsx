import { Button, Group, Modal, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

type DeleteManyConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  title: string;
  message: string;
  count: number;
};

export const DeleteManyConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title,
  message,
  count,
}: DeleteManyConfirmationModalProps) => {
  const { t } = useTranslation();

  return (
    <Modal opened={isOpen} onClose={onClose} title={title} size="md">
      <Text mb="md">{message.replace('{{count}}', count.toString())}</Text>
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
