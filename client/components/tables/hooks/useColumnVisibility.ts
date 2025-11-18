import { useEffect, useState } from 'react';

export function useColumnVisibility(storeColumnsKey?: string) {
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (storeColumnsKey) {
      const storageKey = `${storeColumnsKey}_columns`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const visibility = JSON.parse(stored);
          setColumnVisibility(visibility);
        } catch {
          /* ignore parse errors */
        }
      }
    }
  }, [storeColumnsKey]);

  useEffect(() => {
    if (storeColumnsKey && Object.keys(columnVisibility).length > 0) {
      const storageKey = `${storeColumnsKey}_columns`;
      localStorage.setItem(storageKey, JSON.stringify(columnVisibility));
    }
  }, [columnVisibility, storeColumnsKey]);

  return { columnVisibility, setColumnVisibility };
}
