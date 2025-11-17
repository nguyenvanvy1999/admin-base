import { useEffect, useState } from 'react';

const STORAGE_PREFIX = 'datatable_column_order_';

export const useColumnOrder = (
  storeKey: string | undefined,
  defaultOrder: string[],
): [string[], (newOrder: string[]) => void] => {
  const [order, setOrder] = useState<string[]>(defaultOrder);

  useEffect(() => {
    if (!storeKey) {
      setOrder(defaultOrder);
      return;
    }

    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${storeKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrder(parsed);
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load column order from localStorage', error);
    }

    setOrder(defaultOrder);
  }, [storeKey, defaultOrder]);

  const updateOrder = (newOrder: string[]) => {
    setOrder(newOrder);
    if (storeKey) {
      try {
        localStorage.setItem(
          `${STORAGE_PREFIX}${storeKey}`,
          JSON.stringify(newOrder),
        );
      } catch (error) {
        console.error('Failed to save column order to localStorage', error);
      }
    }
  };

  return [order, updateOrder];
};

export const reorderColumns = <T>(
  columns: T[],
  order: string[],
  getId: (column: T) => string,
): T[] => {
  const columnMap = new Map(columns.map((col) => [getId(col), col]));
  const ordered: T[] = [];
  const unordered: T[] = [];

  for (const id of order) {
    const col = columnMap.get(id);
    if (col) {
      ordered.push(col);
      columnMap.delete(id);
    }
  }

  for (const col of columns) {
    if (columnMap.has(getId(col))) {
      unordered.push(col);
    }
  }

  return [...ordered, ...unordered];
};
