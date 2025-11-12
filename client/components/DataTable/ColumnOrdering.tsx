import { Button, Checkbox, Popover, Stack } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import type { ParseKeys } from 'i18next';
import { type FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  columns: {
    title?: ParseKeys;
  }[];
  storeColumnsKey: string;
  onOrdered: (newColumns: { title?: ParseKeys }[]) => void;
}

export const ColumnOrdering: FC<Props> = ({
  columns,
  storeColumnsKey,
  onOrdered,
}) => {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    const storageKey = `${storeColumnsKey}_columns`;
    const stored = localStorage.getItem(storageKey);
    const columnTitles = columns
      .map((col) => col.title)
      .filter((title): title is ParseKeys => !!title);

    if (stored) {
      const storedList = stored.split('|').filter(Boolean);
      const validList = storedList.filter((title) =>
        columnTitles.includes(title as ParseKeys),
      );
      columnTitles.forEach((title) => {
        if (!validList.includes(title)) {
          validList.push(title);
        }
      });
      localStorage.setItem(storageKey, validList.join('|'));
      setVisibleColumns(validList);
      const ordered = validList
        .map((title) => columns.find((col) => col.title === title))
        .filter((col): col is { title?: ParseKeys } => !!col)
        .concat(
          columns.filter((col) => !col.title || !validList.includes(col.title)),
        );
      onOrdered(ordered);
    } else {
      setVisibleColumns(columnTitles);
    }
  }, [columns, storeColumnsKey, onOrdered]);

  const handleToggle = (title: string) => {
    const newVisible = visibleColumns.includes(title)
      ? visibleColumns.filter((t) => t !== title)
      : [...visibleColumns, title];
    setVisibleColumns(newVisible);
    const storageKey = `${storeColumnsKey}_columns`;
    localStorage.setItem(storageKey, newVisible.join('|'));
    const ordered = newVisible
      .map((t) => columns.find((col) => col.title === t))
      .filter((col): col is { title?: ParseKeys } => !!col)
      .concat(
        columns.filter((col) => !col.title || !newVisible.includes(col.title)),
      );
    onOrdered(ordered);
  };

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-end">
      <Popover.Target>
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconSettings size={16} />}
        >
          Columns
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          {columns
            .filter((col) => col.title)
            .map((col) => {
              const title = col.title!;
              return (
                <Checkbox
                  key={title}
                  label={t(title)}
                  checked={visibleColumns.includes(title)}
                  onChange={() => handleToggle(title)}
                />
              );
            })}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
