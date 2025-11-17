export type BalanceAdjustmentMetadata = {
  oldBalance: number;
  newBalance: number;
};

export function isBalanceAdjustmentMetadata(
  value: unknown,
): value is BalanceAdjustmentMetadata {
  return (
    typeof value === 'object' &&
    value !== null &&
    'oldBalance' in value &&
    'newBalance' in value &&
    typeof (value as BalanceAdjustmentMetadata).oldBalance === 'number' &&
    typeof (value as BalanceAdjustmentMetadata).newBalance === 'number'
  );
}
