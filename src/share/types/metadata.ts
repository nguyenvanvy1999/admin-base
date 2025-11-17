import type { Prisma } from '@server/generated';

export type TransactionMetadata = Prisma.JsonValue;
export type TradeMeta = Prisma.JsonValue;
export type AccountMeta = Prisma.JsonValue;
export type InvestmentExtra = Prisma.JsonValue;

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
