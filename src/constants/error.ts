export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  ENTITY_NOT_FOUND: 'ENTITY_NOT_FOUND',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  CURRENCY_NOT_FOUND: 'CURRENCY_NOT_FOUND',
  INVESTMENT_NOT_FOUND: 'INVESTMENT_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  DUPLICATE_NAME: 'DUPLICATE_NAME',
  INVALID_TRANSACTION_TYPE: 'INVALID_TRANSACTION_TYPE',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  EXCHANGE_RATE_ERROR: 'EXCHANGE_RATE_ERROR',
  INVALID_CURRENCY_MISMATCH: 'INVALID_CURRENCY_MISMATCH',
  WITHDRAWAL_EXCEEDS_BALANCE: 'WITHDRAWAL_EXCEEDS_BALANCE',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  constructor(
    public code: ErrorCodeType,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function throwAppError(code: ErrorCodeType, message: string): never {
  throw new AppError(code, message);
}
