export const ERROR_MESSAGES = {
  ACCOUNT_NOT_FOUND: 'Account not found',
  CATEGORY_NOT_FOUND: 'Category not found',
  ENTITY_NOT_FOUND: 'Entity not found',
  TRANSACTION_NOT_FOUND: 'Transaction not found',
  CURRENCY_NOT_FOUND: 'Currency not found',
  USER_NOT_FOUND: 'User not found',
  BUDGET_NOT_FOUND: 'Budget not found',
  EVENT_NOT_FOUND: 'Event not found',
  INVESTMENT_NOT_FOUND: 'Investment not found',
  TRADE_NOT_FOUND: 'Trade not found',
  CONTRIBUTION_NOT_FOUND: 'Contribution not found',
  TAG_NOT_FOUND: 'Tag not found',
  VALUATION_NOT_FOUND: 'Valuation not found',
  TRANSACTION_NOT_OWNED: 'Transaction not owned by user',
  FORBIDDEN: 'Transaction not owned by user',
  INVALID_TRANSACTION_TYPE: 'Invalid transaction type',
  INVALID_TRANSACTION_TYPE_FOR_TRANSFER:
    'Invalid transaction type for transfer update',
  USER_BASE_CURRENCY_REQUIRED: 'User base currency is required',
  USER_BASE_CURRENCY_REQUIRED_DETAILED:
    'User base currency is required. Please set your base currency in profile settings.',
  PAYMENT_DAY_RANGE: 'Payment day must be between 1 and 31',
  NOTIFY_DAYS_BEFORE_MIN:
    'Notify days before must be greater than or equal to 0',
  SOME_ACCOUNTS_NOT_FOUND: 'Some accounts not found',
  SOME_ACCOUNTS_NOT_FOUND_OR_NOT_OWNED:
    'Some accounts were not found or do not belong to you',
  SOME_CATEGORIES_NOT_FOUND: 'Some categories not found',
  TO_ACCOUNT_NOT_FOUND: 'To account not found',
  NEW_BALANCE_MUST_DIFFER: 'New balance must be different from current balance',
  CANNOT_CALCULATE_NEXT_PERIOD_NONE:
    'Cannot calculate next period for none period type',
  CANNOT_CALCULATE_PERIOD_END_NONE:
    'Cannot calculate period end for none period type',
  INVALID_DATE: 'Invalid date provided',
  DUPLICATE_NAME: 'Tag name already exists',
  WITHDRAWAL_EXCEEDS_BALANCE: 'Withdrawal exceeds current cost basis',
} as const;

export const SUCCESS_MESSAGES = {
  ACCOUNT_CREATED: 'Account created successfully',
  ACCOUNT_UPDATED: 'Account updated successfully',
  ACCOUNT_DELETED: 'Account deleted successfully',
  ACCOUNTS_DELETED: (count: number) =>
    `${count} account(s) deleted successfully`,
  TRANSACTION_DELETED: 'Transaction deleted successfully',
} as const;
