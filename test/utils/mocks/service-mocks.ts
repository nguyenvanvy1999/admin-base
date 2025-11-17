import { mock } from 'bun:test';
import type { IBaseRepository } from '@server/repositories/base/base.repository';
import type {
  ICacheService,
  IIdUtil,
  IOwnershipValidatorService,
} from '@server/services/base/interfaces';

/**
 * Creates a mock of a generic BaseRepository.
 * All methods are mocked to return default values.
 */
export function createRepositoryMock<T>(): jest.Mocked<IBaseRepository<T>> {
  return {
    findById: mock(async () => null),
    findByIdAndUserId: mock(async () => null),
    findMany: mock(async () => []),
    findManyByUserId: mock(async () => []),
    findManyByIdsAndUserId: mock(async () => []),
    count: mock(async () => 0),
    countByUserId: mock(async () => 0),
    create: mock(async (data: any) => data),
    update: mock(async (id: string, data: any) => ({ id, ...data })),
    delete: mock(async () => undefined),
    deleteMany: mock(async () => 0),
  };
}

/**
 * Creates a mock for the IdUtil dependency.
 */
export function createIdUtilMock(): jest.Mocked<IIdUtil> {
  return {
    dbId: mock((prefix: string) => `${prefix}_test_id_${Math.random()}`),
    nanoid: mock(() => 'test_nanoid'),
  };
}

/**
 * Creates a mock for the CacheService dependency.
 */
export function createCacheServiceMock(): jest.Mocked<ICacheService> {
  return {
    get: mock(() => undefined),
    set: mock(() => undefined),
    delete: mock(() => undefined),
    clear: mock(() => undefined),
  };
}

/**
 * Creates a mock for the OwnershipValidatorService dependency.
 */
export function createOwnershipValidatorMock(): jest.Mocked<IOwnershipValidatorService> {
  return {
    validateAccountOwnership: mock(async () => ({})),
    validateCategoryOwnership: mock(async () => ({})),
    validateEntityOwnership: mock(async () => ({})),
    validateEventOwnership: mock(async () => ({})),
    validateBudgetOwnership: mock(async () => ({})),
    validateTransactionOwnership: mock(async () => ({})),
    validateInvestmentOwnership: mock(async () => ({})),
  };
}

/**
 * Creates a complete set of mocked dependencies for a standard service.
 */
export function createServiceDependenciesMock<T>() {
  return {
    db: {} as any, // Usually not needed if repository is fully mocked
    repository: createRepositoryMock<T>(),
    ownershipValidator: createOwnershipValidatorMock(),
    idUtil: createIdUtilMock(),
    cache: createCacheServiceMock(),
  };
}
