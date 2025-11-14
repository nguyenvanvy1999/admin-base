import { prisma } from '@server/configs/db';
import { ErrorCode, throwAppError } from '../constants/error';

export interface OwnershipValidationOptions {
  userId: string;
  entityId: string;
  model: string;
  select?: Record<string, boolean>;
  errorCode?: (typeof ErrorCode)[keyof typeof ErrorCode];
  errorMessage?: string;
}

export async function validateOwnership<T = { id: string }>(
  options: OwnershipValidationOptions,
): Promise<T> {
  const {
    userId,
    entityId,
    model,
    select = { id: true },
    errorCode = ErrorCode.NOT_FOUND,
    errorMessage = 'Resource not found',
  } = options;

  const entity = await (prisma as any)[model].findFirst({
    where: {
      id: entityId,
      userId,
      deletedAt: null,
    },
    select,
  });

  if (!entity) {
    throwAppError(errorCode, errorMessage);
  }

  return entity as T;
}

export interface ExistenceValidationOptions {
  id: string;
  model: string;
  select?: Record<string, boolean>;
  errorCode?: (typeof ErrorCode)[keyof typeof ErrorCode];
  errorMessage?: string;
}

export async function ensureExists<T = { id: string }>(
  options: ExistenceValidationOptions,
): Promise<T> {
  const {
    id,
    model,
    select = { id: true },
    errorCode = ErrorCode.NOT_FOUND,
    errorMessage = 'Resource not found',
  } = options;

  const entity = await (prisma as any)[model].findUnique({
    where: { id },
    select,
  });

  if (!entity) {
    throwAppError(errorCode, errorMessage);
  }

  return entity as T;
}

export interface UniqueNameValidationOptions {
  userId: string;
  name: string;
  model: string;
  nameField?: string;
  excludeId?: string;
  errorCode?: (typeof ErrorCode)[keyof typeof ErrorCode];
  errorMessage?: string;
}

export async function validateUniqueName(
  options: UniqueNameValidationOptions,
): Promise<void> {
  const {
    userId,
    name,
    model,
    nameField = 'name',
    excludeId,
    errorCode = ErrorCode.DUPLICATE_NAME,
    errorMessage = 'Name already exists',
  } = options;

  const lowerName = name.toLowerCase().trim();
  const where: any = {
    userId,
    [nameField]: lowerName,
    deletedAt: null,
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const count = await (prisma as any)[model].count({ where });

  if (count > 0) {
    throwAppError(errorCode, errorMessage);
  }
}

export async function validateCurrency(currencyId: string): Promise<void> {
  const count = await prisma.currency.count({
    where: { id: currencyId },
  });

  if (count === 0) {
    throwAppError(ErrorCode.CURRENCY_NOT_FOUND, 'Currency not found');
  }
}
