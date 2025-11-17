import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import { ERROR_MESSAGES, ErrorCode, throwAppError } from '@server/share';

export class OwnershipValidatorService {
  constructor(private readonly deps: { db: IDb } = { db: prisma }) {}

  async validateAccountOwnership(
    userId: string,
    accountId: string,
    select?: { id: true } | Record<string, boolean>,
  ): Promise<{ id: string } & Record<string, any>> {
    const account = await this.deps.db.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
      select: select ?? { id: true },
    });
    if (!account) {
      throwAppError(
        ErrorCode.ACCOUNT_NOT_FOUND,
        ERROR_MESSAGES.ACCOUNT_NOT_FOUND,
      );
    }
    return account as { id: string } & Record<string, any>;
  }

  async validateCategoryOwnership(
    userId: string,
    categoryId: string,
  ): Promise<{ id: string; userId: string }> {
    const category = await this.deps.db.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
      select: { id: true, userId: true },
    });
    if (!category) {
      throwAppError(ErrorCode.NOT_FOUND, ERROR_MESSAGES.CATEGORY_NOT_FOUND);
    }
    return category;
  }

  async validateEntityOwnership(
    userId: string,
    entityId: string,
  ): Promise<{ id: string; userId: string }> {
    const entity = await this.deps.db.entity.findFirst({
      where: {
        id: entityId,
        userId,
      },
      select: { id: true, userId: true },
    });
    if (!entity) {
      throwAppError(
        ErrorCode.ENTITY_NOT_FOUND,
        ERROR_MESSAGES.ENTITY_NOT_FOUND,
      );
    }
    return entity;
  }

  async validateEventOwnership(
    userId: string,
    eventId: string,
  ): Promise<{ id: string; userId: string }> {
    const event = await this.deps.db.event.findFirst({
      where: {
        id: eventId,
        userId,
      },
      select: { id: true, userId: true },
    });
    if (!event) {
      throwAppError(ErrorCode.EVENT_NOT_FOUND, ERROR_MESSAGES.EVENT_NOT_FOUND);
    }
    return event;
  }

  async validateBudgetOwnership(
    userId: string,
    budgetId: string,
  ): Promise<{ id: string; userId: string }> {
    const budget = await this.deps.db.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
      select: { id: true, userId: true },
    });
    if (!budget) {
      throwAppError(
        ErrorCode.BUDGET_NOT_FOUND,
        ERROR_MESSAGES.BUDGET_NOT_FOUND,
      );
    }
    return budget;
  }

  async validateTransactionOwnership(
    userId: string,
    transactionId: string,
  ): Promise<{ id: string; userId: string }> {
    const transaction = await this.deps.db.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      select: { id: true, userId: true },
    });
    if (!transaction) {
      throwAppError(ErrorCode.NOT_FOUND, ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
    }
    return transaction;
  }
}

export const ownershipValidatorService = new OwnershipValidatorService();
