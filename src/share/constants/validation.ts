export const VALIDATION = {
  PAYMENT_DAY: {
    MIN: 1,
    MAX: 31,
  },
  NOTIFY_DAYS_BEFORE: {
    MIN: 0,
  },
  AMOUNT: {
    MIN: 0.01,
  },
  FEE: {
    MIN: 0,
  },
} as const;
