import type { AccountType } from '@server/generated/prisma/enums';
import type { AccountResponse } from '@server/src/dto/account.dto';

export type AccountFull = AccountResponse;

export type AccountFormData = {
  id?: string;
  type: AccountType;
  name: string;
  currencyId: string;
  initialBalance?: number;
  creditLimit?: number;
  notifyOnDueDate?: boolean;
  paymentDay?: number;
  notifyDaysBefore?: number;
};
