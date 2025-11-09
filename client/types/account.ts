import type { AccountType } from '@server/generated/prisma/enums';

export type Currency = {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
};

export type BaseAccount = {
  id: string;
  type: string;
  name: string;
  currencyId: string;
  currency: Currency;
};

export type AccountFull = BaseAccount & {
  balance: string;
  creditLimit: string | null;
  notifyOnDueDate: boolean | null;
  paymentDay: number | null;
  notifyDaysBefore: number | null;
};

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
