export const CURRENCY_SELECT_BASIC = {
  id: true,
  code: true,
  name: true,
  symbol: true,
} as const;

export const ACCOUNT_SELECT_FULL = {
  id: true,
  type: true,
  name: true,
  currencyId: true,
  balance: true,
  creditLimit: true,
  notifyOnDueDate: true,
  paymentDay: true,
  notifyDaysBefore: true,
  meta: true,
  created: true,
  modified: true,
  currency: {
    select: CURRENCY_SELECT_BASIC,
  },
} as const;

export const ACCOUNT_SELECT_MINIMAL = {
  id: true,
} as const;

export const ACCOUNT_SELECT_WITH_CURRENCY = {
  id: true,
  currencyId: true,
} as const;

export const CATEGORY_SELECT_MINIMAL = {
  id: true,
  userId: true,
  isLocked: true,
  type: true,
  parentId: true,
} as const;

export const TAG_SELECT_FULL = {
  id: true,
  name: true,
  description: true,
  created: true,
  modified: true,
} as const;

export const TAG_SELECT_MINIMAL = {
  id: true,
} as const;

export const ENTITY_SELECT_FULL = {
  id: true,
  name: true,
  type: true,
  phone: true,
  email: true,
  address: true,
  note: true,
  created: true,
  modified: true,
} as const;

export const ENTITY_SELECT_MINIMAL = {
  id: true,
} as const;

export const EVENT_SELECT_FULL = {
  id: true,
  name: true,
  startAt: true,
  endAt: true,
  created: true,
  modified: true,
} as const;

export const EVENT_SELECT_MINIMAL = {
  id: true,
} as const;

export const BUDGET_SELECT_FULL = {
  id: true,
  userId: true,
  name: true,
  amount: true,
  period: true,
  startDate: true,
  endDate: true,
  carryOver: true,
  created: true,
  modified: true,
  categories: {
    select: {
      categoryId: true,
    },
  },
  accounts: {
    select: {
      accountId: true,
    },
  },
} as const;

export const BUDGET_SELECT_MINIMAL = {
  id: true,
  userId: true,
  amount: true,
  period: true,
  carryOver: true,
  startDate: true,
  endDate: true,
} as const;

export const INVESTMENT_SELECT_FULL = {
  id: true,
  userId: true,
  symbol: true,
  name: true,
  assetType: true,
  mode: true,
  currencyId: true,
  baseCurrencyId: true,
  extra: true,
  created: true,
  modified: true,
  currency: {
    select: CURRENCY_SELECT_BASIC,
  },
  baseCurrency: {
    select: CURRENCY_SELECT_BASIC,
  },
} as const;

export const VALUATION_SELECT_FULL = {
  id: true,
  userId: true,
  investmentId: true,
  currencyId: true,
  price: true,
  priceInBaseCurrency: true,
  exchangeRate: true,
  baseCurrencyId: true,
  timestamp: true,
  source: true,
  fetchedAt: true,
  created: true,
  modified: true,
  currency: {
    select: CURRENCY_SELECT_BASIC,
  },
  baseCurrency: {
    select: CURRENCY_SELECT_BASIC,
  },
} as const;

export const TRADE_SELECT_FULL = {
  id: true,
  userId: true,
  investmentId: true,
  accountId: true,
  side: true,
  timestamp: true,
  price: true,
  quantity: true,
  amount: true,
  fee: true,
  currencyId: true,
  transactionId: true,
  priceCurrency: true,
  priceInBaseCurrency: true,
  amountInBaseCurrency: true,
  exchangeRate: true,
  baseCurrencyId: true,
  priceSource: true,
  priceFetchedAt: true,
  meta: true,
  created: true,
  modified: true,
  account: {
    select: {
      id: true,
      name: true,
    },
  },
  currency: {
    select: CURRENCY_SELECT_BASIC,
  },
  baseCurrency: {
    select: CURRENCY_SELECT_BASIC,
  },
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

export const CONTRIBUTION_SELECT_FULL = {
  id: true,
  userId: true,
  investmentId: true,
  accountId: true,
  amount: true,
  currencyId: true,
  type: true,
  amountInBaseCurrency: true,
  exchangeRate: true,
  baseCurrencyId: true,
  timestamp: true,
  note: true,
  created: true,
  modified: true,
  account: {
    select: {
      id: true,
      name: true,
    },
  },
  currency: {
    select: CURRENCY_SELECT_BASIC,
  },
  baseCurrency: {
    select: CURRENCY_SELECT_BASIC,
  },
} as const;

export const CONTRIBUTION_SELECT_FOR_POSITION = {
  amount: true,
  type: true,
  amountInBaseCurrency: true,
  exchangeRate: true,
} as const;

export const TRANSACTION_SELECT_FULL = {
  id: true,
  userId: true,
  accountId: true,
  toAccountId: true,
  transferGroupId: true,
  isTransferMirror: true,
  type: true,
  categoryId: true,
  entityId: true,
  investmentId: true,
  eventId: true,
  amount: true,
  currencyId: true,
  price: true,
  priceInBaseCurrency: true,
  quantity: true,
  fee: true,
  feeInBaseCurrency: true,
  date: true,
  dueDate: true,
  note: true,
  receiptUrl: true,
  metadata: true,
  created: true,
  modified: true,
  account: {
    select: {
      id: true,
      name: true,
      currency: { select: CURRENCY_SELECT_BASIC },
    },
  },
  toAccount: {
    select: {
      id: true,
      name: true,
      currency: { select: CURRENCY_SELECT_BASIC },
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      type: true,
      icon: true,
      color: true,
    },
  },
  entity: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
  event: {
    select: {
      id: true,
      name: true,
      startAt: true,
      endAt: true,
    },
  },
  currency: { select: CURRENCY_SELECT_BASIC },
} as const;

export const TRANSACTION_SELECT_FOR_BALANCE = {
  id: true,
  userId: true,
  type: true,
  accountId: true,
  toAccountId: true,
  transferGroupId: true,
  isTransferMirror: true,
  amount: true,
  fee: true,
  currencyId: true,
  account: { select: { currencyId: true } },
  toAccount: { select: { currencyId: true } },
} as const;

export const TRANSACTION_SELECT_MINIMAL = {
  id: true,
  userId: true,
  currencyId: true,
} as const;

export const USER_SELECT_FOR_INFO = {
  id: true,
  username: true,
  name: true,
  baseCurrencyId: true,
  settings: true,
  created: true,
  modified: true,
  roles: { select: { roleId: true } },
} as const;

export const USER_SELECT_FOR_VALIDATION = {
  id: true,
  password: true,
} as const;

export const USER_SELECT_FOR_LOGIN = {
  id: true,
  username: true,
  name: true,
  baseCurrencyId: true,
  settings: true,
  password: true,
  created: true,
  modified: true,
  roles: { select: { roleId: true } },
} as const;
