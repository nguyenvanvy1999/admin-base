import { Box, Button, Group, Select, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  pageSize?: {
    options?: number[];
    onPageSizeChange: (size: number) => void;
  };
};

const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  isLoading = false,
  pageSize,
}: PaginationProps) => {
  const { t } = useTranslation();

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1 && !pageSize) return null;

  const pageSizeOptions = pageSize?.options || [10, 20, 50, 100];

  return (
    <Box
      p="sm"
      style={{
        borderTop: '1px solid var(--mantine-color-gray-3)',
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      <Group
        justify="space-between"
        align="center"
        gap="md"
        wrap="wrap"
        visibleFrom="sm"
      >
        <Text size="sm" c="dimmed">
          {t('common.showing', { defaultValue: 'Showing' })}{' '}
          <Text component="span" fw={500} c="var(--mantine-color-text)">
            {startItem}
          </Text>{' '}
          {t('common.to', { defaultValue: 'to' })}{' '}
          <Text component="span" fw={500} c="var(--mantine-color-text)">
            {endItem}
          </Text>{' '}
          {t('common.of', { defaultValue: 'of' })}{' '}
          <Text component="span" fw={500} c="var(--mantine-color-text)">
            {totalItems}
          </Text>{' '}
          {t('common.results', { defaultValue: 'results' })}
        </Text>

        <Group gap="xs">
          {pageSize && (
            <Group gap="xs">
              <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {t('common.pageSizeLabel', { defaultValue: 'Show' })}
              </Text>
              <Select
                value={itemsPerPage.toString()}
                onChange={(value) => {
                  if (value) {
                    pageSize.onPageSizeChange(parseInt(value, 10));
                  }
                }}
                data={pageSizeOptions.map((size) => ({
                  value: size.toString(),
                  label: size.toString(),
                }))}
                disabled={isLoading}
                size="xs"
                w={70}
              />
            </Group>
          )}

          {totalPages > 1 && (
            <Group gap={1}>
              <Button
                variant="light"
                size="xs"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                aria-label={t('common.previous', { defaultValue: 'Previous' })}
                styles={{
                  root: {
                    minWidth: '24px',
                    width: '24px',
                    height: '24px',
                    padding: '0',
                  },
                }}
              >
                <IconChevronLeft size={12} />
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'filled' : 'light'}
                        size="xs"
                        onClick={() => onPageChange(page)}
                        disabled={isLoading}
                        styles={{
                          root: {
                            minWidth: '24px',
                            height: '24px',
                            padding: '0 6px',
                            fontSize: '11px',
                          },
                        }}
                      >
                        {page}
                      </Button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return (
                      <Text
                        key={page}
                        size="xs"
                        c="dimmed"
                        px={2}
                        style={{ userSelect: 'none', fontSize: '11px' }}
                      >
                        ...
                      </Text>
                    );
                  }
                  return null;
                },
              )}

              <Button
                variant="light"
                size="xs"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
                aria-label={t('common.next', { defaultValue: 'Next' })}
                styles={{
                  root: {
                    minWidth: '24px',
                    width: '24px',
                    height: '24px',
                    padding: '0',
                  },
                }}
              >
                <IconChevronRight size={12} />
              </Button>
            </Group>
          )}
        </Group>
      </Group>

      <Group justify="space-between" gap="xs" hiddenFrom="sm">
        <Button
          variant="light"
          size="xs"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          leftSection={<IconChevronLeft size={14} />}
          flex={1}
        >
          {t('common.previous', { defaultValue: 'Previous' })}
        </Button>
        <Button
          variant="light"
          size="xs"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          rightSection={<IconChevronRight size={14} />}
          flex={1}
        >
          {t('common.next', { defaultValue: 'Next' })}
        </Button>
      </Group>
    </Box>
  );
};

export default Pagination;
