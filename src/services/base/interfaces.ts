import type { Prisma, PrismaClient } from '@server/generated';

/**
 * Interface for the database client.
 * This allows for mocking the Prisma client in tests.
 */
export type IDb = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Interface for the ID generation utility.
 */
export interface IIdUtil {
  dbId(prefix: string): string;
  nanoid(size?: number): string;
}

/**
 * Interface for the cache service.
 */
export interface ICacheService {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
}

/**
 * Interface for the ownership validation service.
 * This helps in mocking ownership checks during testing.
 */
export interface IOwnershipValidatorService {
  validateAccountOwnership(
    userId: string,
    accountId: string,
    select?: any,
  ): Promise<any>;
  validateCategoryOwnership(userId: string, categoryId: string): Promise<any>;
  validateEntityOwnership(userId: string, entityId: string): Promise<any>;
  validateEventOwnership(userId: string, eventId: string): Promise<any>;
  validateBudgetOwnership(userId: string, budgetId: string): Promise<any>;
  validateTransactionOwnership(
    userId: string,
    transactionId: string,
  ): Promise<any>;
  validateInvestmentOwnership(
    userId: string,
    investmentId: string,
  ): Promise<any>;
}

// Add interfaces for other complex services if needed for mocking
// For example:
// export interface ICurrencyConversionService { ... }
