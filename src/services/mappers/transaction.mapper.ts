import type { Prisma } from '@server/generated';
import {
  dateToIsoString,
  dateToNullableIsoString,
  decimalToNullableString,
  decimalToString,
} from '@server/share';
import type { TransactionDetail } from '../../dto/transaction.dto';
import type { TRANSACTION_SELECT_FULL } from '../selects';

type TransactionRecord = Prisma.TransactionGetPayload<{
  select: typeof TRANSACTION_SELECT_FULL;
}>;

type MinimalCurrency = {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
};

export const mapCurrencyRecord = (
  currency: MinimalCurrency | null | undefined,
) => {
  if (!currency) {
    return null;
  }
  return {
    ...currency,
    symbol: currency.symbol ?? null,
  };
};

export type { TransactionRecord, MinimalCurrency };

export const mapAccountRecord = (
  account: NonNullable<TransactionRecord['account']>,
) => ({
  ...account,
  currency: mapCurrencyRecord(account.currency)!,
});

export const mapOptionalAccountRecord = (
  account: TransactionRecord['toAccount'],
) => {
  if (!account) {
    return null;
  }
  return {
    ...account,
    currency: mapCurrencyRecord(account.currency)!,
  };
};

export const mapCategoryRecord = (category: TransactionRecord['category']) => {
  if (!category) {
    return null;
  }
  return {
    ...category,
    icon: category.icon ?? null,
    color: category.color ?? null,
  };
};

export const mapEntityRecord = (entity: TransactionRecord['entity']) => {
  if (!entity) {
    return null;
  }
  return { ...entity };
};

export const mapEventRecord = (
  event: TransactionRecord['event'],
): TransactionDetail['event'] => {
  if (!event) {
    return null;
  }
  return {
    id: event.id,
    name: event.name,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt ? event.endAt.toISOString() : null,
  };
};

export const mapTransaction = (
  transaction: TransactionRecord,
): TransactionDetail => ({
  ...transaction,
  toAccountId: transaction.toAccountId ?? null,
  transferGroupId: transaction.transferGroupId ?? null,
  categoryId: transaction.categoryId,
  entityId: transaction.entityId ?? null,
  investmentId: transaction.investmentId ?? null,
  eventId: transaction.eventId ?? null,
  amount: decimalToString(transaction.amount),
  price: decimalToNullableString(transaction.price),
  priceInBaseCurrency: decimalToNullableString(transaction.priceInBaseCurrency),
  quantity: decimalToNullableString(transaction.quantity),
  fee: decimalToString(transaction.fee),
  feeInBaseCurrency: decimalToNullableString(transaction.feeInBaseCurrency),
  date: dateToIsoString(transaction.date),
  dueDate: dateToNullableIsoString(transaction.dueDate),
  note: transaction.note ?? null,
  receiptUrl: transaction.receiptUrl ?? null,
  metadata: transaction.metadata ?? null,
  created: dateToIsoString(transaction.created),
  modified: dateToIsoString(transaction.modified),
  account: mapAccountRecord(transaction.account!),
  toAccount: mapOptionalAccountRecord(transaction.toAccount),
  category: mapCategoryRecord(transaction.category),
  entity: mapEntityRecord(transaction.entity),
  event: mapEventRecord(transaction.event),
  currency: mapCurrencyRecord(transaction.currency),
});
