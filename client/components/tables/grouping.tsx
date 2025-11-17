import type React from 'react';
import type { GroupedCellProps } from './types';

export function createGroupedCell<T>(
  render: (value: unknown, props: GroupedCellProps<T>) => React.ReactNode,
) {
  return (props: GroupedCellProps<T>) => {
    const value = props.cell.getValue();
    return render(value, props);
  };
}

export function renderGroupedCellWithCount<T extends Record<string, any>>(
  formatValue?: (value: unknown) => string,
) {
  return createGroupedCell<T>((value, props) => {
    const formatted = formatValue ? formatValue(value) : String(value);
    const count = props.row.subRows?.length || 0;
    return (
      <span style={{ fontWeight: 'bold' }}>
        {formatted} ({count})
      </span>
    );
  });
}

export function renderGroupedCellSimple<T extends Record<string, any>>(
  formatValue?: (value: unknown) => string,
) {
  return createGroupedCell<T>((value) => {
    const formatted = formatValue ? formatValue(value) : String(value);
    return <span style={{ fontWeight: 'bold' }}>{formatted}</span>;
  });
}

export const groupingHelpers = {
  renderWithCount: renderGroupedCellWithCount,
  renderSimple: renderGroupedCellSimple,
};
