# DataTable Component

Type-safe, flexible data table component built on Mantine React Table.

## Features

- **Type-safe column definitions** with full IntelliSense support
- **Nested path accessors** (e.g., `'account.currency.symbol'`)
- **Grouping support** with type-safe grouped cell rendering
- **Aggregation** with built-in functions and custom renderers
- **Backward compatible** with existing code

## Basic Usage

### Old API (Still Supported)

```typescript
const columns = useMemo((): DataTableColumn<TransactionDetail>[] => [
  {
    accessor: 'id',
    title: 'transactions.id',
  },
  {
    accessor: (row) => row.account?.name ?? '',
    title: 'transactions.account',
  },
]);
```

### New Type-Safe API

```typescript
import { createColumnHelper } from './tables';
import type { TransactionDetail } from '@server/dto/transaction.dto';

const columnHelper = createColumnHelper<TransactionDetail>();
const columns = useMemo(() => [
  columnHelper.accessor('id', {
    title: 'transactions.id',
  }),
  columnHelper.accessor('account.name', {
    title: 'transactions.account',
  }),
  columnHelper.accessor((row) => row.amount, {
    title: 'transactions.amount',
    format: 'currency',
  }),
], []);
```

## Type-Safe Accessors

### String Accessors with Nested Paths

```typescript
columnHelper.accessor('id') // ✅ Type-safe
columnHelper.accessor('account.name') // ✅ Type-safe, suggests nested paths
columnHelper.accessor('account.currency.symbol') // ✅ Type-safe
columnHelper.accessor('invalid.path') // ❌ TypeScript error
```

### Function Accessors

```typescript
columnHelper.accessor((row) => row.amount, {
  title: 'transactions.amount',
  // Type of 'row' is inferred as TransactionDetail
  // Return type is inferred from the function
})
```

## Grouping

### Basic Grouping

```typescript
import { groupingHelpers } from './tables';

const columns = useMemo(() => [
  columnHelper.accessor('date', {
    title: 'transactions.date',
    enableGrouping: true,
    GroupedCell: groupingHelpers.renderWithCount((value) => 
      formatDateGroupKey(value as string, 'day')
    ),
  }),
], []);
```

### Custom Grouped Cell

```typescript
import type { GroupedCellProps } from './tables';

const columns = useMemo(() => [
  columnHelper.accessor('category.name', {
    title: 'transactions.category',
    enableGrouping: true,
    GroupedCell: ({ row, cell }: GroupedCellProps<TransactionDetail>) => {
      const value = cell.getValue();
      const count = row.subRows?.length || 0;
      return (
        <Box style={{ fontWeight: 'bold' }}>
          {String(value)} ({count})
        </Box>
      );
    },
  }),
], []);
```

## Aggregation

### Built-in Aggregation Functions

```typescript
import { aggregation, aggregationHelpers } from './tables';

const columns = useMemo(() => [
  columnHelper.accessor((row) => row.amount, {
    title: 'transactions.amount',
    aggregationFn: aggregation.sum,
    AggregatedCell: aggregationHelpers.renderSum(),
  }),
], []);
```

### Aggregation with Currency

```typescript
const columns = useMemo(() => [
  columnHelper.accessor((row) => row.amount, {
    title: 'transactions.amount',
    aggregationFn: aggregation.sum,
    AggregatedCell: aggregationHelpers.renderSumWithCurrency<TransactionDetail>(
      (row) => row.account?.currency?.symbol
    ),
  }),
], []);
```

### Custom Aggregated Cell

```typescript
import type { AggregatedCellProps } from './tables';

const columns = useMemo(() => [
  columnHelper.accessor((row) => row.amount, {
    title: 'transactions.amount',
    aggregationFn: aggregation.sum,
    AggregatedCell: ({ row, cell }: AggregatedCellProps<TransactionDetail>) => {
      const value = cell.getValue() as number;
      return (
        <NumberFormatter
          value={value}
          prefix="$ "
          thousandSeparator=","
          decimalScale={2}
        />
      );
    },
  }),
], []);
```

## Available Aggregation Functions

- `aggregation.sum` - Sum of values
- `aggregation.avg` - Average of values
- `aggregation.count` - Count of items
- `aggregation.min` - Minimum value
- `aggregation.max` - Maximum value
- `aggregation.median` - Median value
- `aggregation.unique` - Unique values
- `aggregation.uniqueCount` - Count of unique values

## Migration Guide

### Step 1: Import the Helper

```typescript
import { createColumnHelper } from './tables';
```

### Step 2: Create Helper Instance

```typescript
const columnHelper = createColumnHelper<YourDataType>();
```

### Step 3: Convert Columns

**Before:**
```typescript
{
  accessor: 'name',
  title: 'common.name',
}
```

**After:**
```typescript
columnHelper.accessor('name', {
  title: 'common.name',
})
```

### Step 4: Update Nested Accessors

**Before:**
```typescript
{
  accessor: (row) => row.account?.name ?? '',
  title: 'transactions.account',
}
```

**After:**
```typescript
columnHelper.accessor('account.name', {
  title: 'transactions.account',
})
```

## Type Definitions

### DataTableColumn<T, V>

- `T`: The row data type
- `V`: The value type (inferred from accessor, defaults to `unknown`)

### GroupedCellProps<T>

Props for custom grouped cell renderers:
- `row: Row<T>` - The grouped row
- `cell: CellContext<T, unknown>` - The cell context

### AggregatedCellProps<T>

Props for custom aggregated cell renderers:
- `row: Row<T>` - The aggregated row
- `cell: CellContext<T, unknown>` - The cell context

## Best Practices

1. **Use type-safe accessors** when possible for better IntelliSense
2. **Use nested paths** instead of function accessors when accessing nested properties
3. **Memoize columns** to prevent unnecessary re-renders
4. **Use built-in aggregation helpers** for common aggregation patterns
5. **Keep custom renderers simple** and extract complex logic to separate functions

## Examples

See `TransactionTable.tsx` and `DebtTransactionTable.tsx` for complete examples.

