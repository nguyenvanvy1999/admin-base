export interface IOwnershipValidatorService {
  validateAccountOwnership(
    userId: string,
    accountId: string,
    select?: { id: true } | Record<string, boolean>,
  ): Promise<{ id: string }>;
  validateCategoryOwnership(
    userId: string,
    categoryId: string,
  ): Promise<{ id: string; userId: string }>;
  validateEntityOwnership(
    userId: string,
    entityId: string,
  ): Promise<{ id: string; userId: string }>;
  validateEventOwnership(
    userId: string,
    eventId: string,
  ): Promise<{ id: string; userId: string }>;
  validateBudgetOwnership(
    userId: string,
    budgetId: string,
  ): Promise<{ id: string; userId: string }>;
  validateTransactionOwnership(
    userId: string,
    transactionId: string,
  ): Promise<{ id: string; userId: string }>;
}
