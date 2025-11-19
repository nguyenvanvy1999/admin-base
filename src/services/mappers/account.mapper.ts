import type { Prisma } from '@server/generated';
import {
  dateToIsoString,
  decimalToNullableString,
  decimalToString,
} from '@server/share';
import type { AccountResponse } from '../../dto/account.dto';
import type { ACCOUNT_SELECT_FULL } from '../selects';

type AccountRecord = Prisma.AccountGetPayload<{
  select: typeof ACCOUNT_SELECT_FULL;
}>;

export const mapAccount = (account: AccountRecord): AccountResponse => ({
  ...account,
  balance: decimalToString(account.balance),
  creditLimit: decimalToNullableString(account.creditLimit),
  notifyOnDueDate: account.notifyOnDueDate ?? null,
  paymentDay: account.paymentDay ?? null,
  notifyDaysBefore: account.notifyDaysBefore ?? null,
  meta: account.meta ?? null,
  created: dateToIsoString(account.created),
  modified: dateToIsoString(account.modified),
});
