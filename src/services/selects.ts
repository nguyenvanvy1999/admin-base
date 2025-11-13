export const CURRENCY_SELECT_BASIC = {
  id: true,
  code: true,
  name: true,
  symbol: true,
} as const;

export const TRADE_SELECT_MINIMAL = {
  id: true,
  side: true,
  amount: true,
  fee: true,
  accountId: true,
} as const;

export const TRADE_SELECT_FOR_POSITION = {
  side: true,
  quantity: true,
  amount: true,
  fee: true,
  price: true,
  amountInBaseCurrency: true,
  exchangeRate: true,
} as const;

export const CONTRIBUTION_SELECT_MINIMAL = {
  id: true,
  type: true,
  amount: true,
  accountId: true,
} as const;

export const CONTRIBUTION_SELECT_FOR_POSITION = {
  amount: true,
  type: true,
  amountInBaseCurrency: true,
  exchangeRate: true,
} as const;

export const ACCOUNT_SELECT_FOR_BALANCE = {
  id: true,
  currencyId: true,
} as const;
