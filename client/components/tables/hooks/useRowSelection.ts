import { useEffect, useState } from 'react';

export function useRowSelection<T extends { id: string }>({
  selectedRecords,
  onSelectedRecordsChange,
  idAccessor,
  tableData,
}: {
  selectedRecords?: T[];
  onSelectedRecordsChange?: (records: T[]) => void;
  idAccessor: keyof T & string;
  tableData: T[];
}) {
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedRecords && onSelectedRecordsChange) {
      const map: Record<string, boolean> = {};
      selectedRecords.forEach((r) => {
        const id = (r as Record<string, unknown>)[idAccessor];
        if (id) map[String(id)] = true;
      });
      setRowSelection(map);
    }
  }, [selectedRecords, onSelectedRecordsChange, idAccessor]);

  const handleRowSelectionChange = (
    updater:
      | Record<string, boolean>
      | ((prev: Record<string, boolean>) => Record<string, boolean>),
  ) => {
    const next =
      typeof updater === 'function' ? updater(rowSelection) : updater;
    setRowSelection(next);
    if (onSelectedRecordsChange) {
      const selected = Object.keys(next)
        .filter((k) => next[k])
        .map((k) => tableData.find((r) => String(r[idAccessor]) === k))
        .filter(Boolean) as T[];
      onSelectedRecordsChange(selected);
    }
  };

  return { rowSelection, handleRowSelectionChange };
}
