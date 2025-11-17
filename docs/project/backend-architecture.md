# Backend Architecture Documentation

## 1. Overview

This document outlines the refactored backend architecture, designed to improve code quality, maintainability, and testability. The core principles are:

- **Separation of Concerns**: Code is organized into distinct layers (Controller, Service, Repository).
- **Don't Repeat Yourself (DRY)**: Common logic is abstracted into base classes and utilities.
- **Dependency Injection (DI)**: Dependencies are injected via constructors, promoting loose coupling.
- **Type Safety**: Leveraging TypeScript and Prisma's generated types to ensure type safety at all layers.

## 2. Layered Architecture

The architecture is divided into three main layers:

```
┌────────────────────┐
│ Controller Layer   │ (Handles HTTP requests, validation, and response formatting)
└──────────┬─────────┘
           │
┌──────────▼─────────┐
│   Service Layer    │ (Contains business logic, orchestrates repositories)
└──────────┬─────────┘
           │
┌──────────▼─────────┐
│  Repository Layer  │ (Handles data access and database operations)
└──────────┬─────────┘
           │
┌──────────▼─────────┐
│      Database      │ (Prisma Client)
└────────────────────┘
```

- **Controller**: Responsible for handling incoming HTTP requests, validating input (DTOs), calling the appropriate service method, and formatting the HTTP response. It should not contain any business logic.
- **Service**: Contains the core business logic of the application. It orchestrates calls to one or more repositories and other services. All business rules, complex validations, and data manipulations happen here.
- **Repository**: The only layer that directly interacts with the database (via Prisma Client). Its sole responsibility is to query and mutate data for a specific entity.

## 3. Core Patterns

### 3.1. BaseRepository

To eliminate boilerplate CRUD code in repositories, we use a `BaseRepository`.

**File**: `src/repositories/base/base.repository.ts`

**Key Features**:
- **Type-Safe**: It uses generics and a Prisma delegate (e.g., `prisma.user`) to ensure full type safety. It does **not** use string model names.
- **Common Methods**: Provides standard CRUD methods like `findById`, `findManyByUserId`, `create`, `update`, `deleteMany`, etc.

**Example Usage (`EntityRepository`)**:

```typescript
// src/repositories/entity.repository.ts
import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated';
import { ENTITY_SELECT_FULL } from '@server/services/selects';
import { BaseRepository } from './base/base.repository';

type EntityRecord = Prisma.EntityGetPayload<{
  select: typeof ENTITY_SELECT_FULL;
}>;

export class EntityRepository extends BaseRepository<
  typeof prisma.entity, // <-- Prisma Delegate
  EntityRecord,         // <-- Return Type
  typeof ENTITY_SELECT_FULL // <-- Select Object
> {
  constructor() {
    super(prisma.entity, ENTITY_SELECT_FULL);
  }

  // Add specific methods for Entity here if needed
}
```

### 3.2. BaseService

Similar to the repository layer, a `BaseService` is used to abstract common service logic.

**File**: `src/services/base/base.service.ts`

**Key Features**:
- **Abstracts Common Logic**: Provides default implementations for `deleteMany` and `validateOwnership`.
- **Enforces Structure**: Defines abstract methods (`upsert`, `list`, `formatEntity`) that child services must implement.
- **Dependency Injection**: Takes a `deps` object in its constructor, making it easy to mock dependencies.

**Example Usage (`EntityService`)**:

```typescript
// src/services/entity.service.ts
export class EntityService extends BaseService<
  EntityRecord,
  IUpsertEntityDto,
  EntityResponse,
  EntityListResponse,
  EntityRepository
> {
  constructor(deps: ...) {
    super(deps, {
      entityName: 'Entity',
      dbPrefix: DB_PREFIX.ENTITY,
    });
  }

  // Implement abstract methods
  protected formatEntity(entity: EntityRecord): EntityResponse { ... }
  async upsert(userId: string, data: IUpsertEntityDto): Promise<EntityResponse> { ... }
  async list(userId: string, query: IListEntitiesQueryDto): Promise<EntityListResponse> { ... }

  // Override methods if special logic is needed
  protected async validateBeforeDelete(entities: EntityRecord[]): Promise<void> { ... }
}
```

### 3.3. Dependency Injection (DI) and Interfaces

To facilitate testing, all services depend on **interfaces** rather than concrete implementations.

**File**: `src/services/base/interfaces.ts`

This file defines interfaces for common dependencies like `IIdUtil`, `ICacheService`, and `IOwnershipValidatorService`.

**How it's used in a service constructor:**

```typescript
// constructor in a service
constructor(
  deps: {
    db: IDb;
    repository: EntityRepository;
    ownershipValidator: IOwnershipValidatorService; // <-- Using interface
    idUtil: IIdUtil;                         // <-- Using interface
    cache: ICacheService;                      // <-- Using interface
  } = {
    // Default concrete implementations
    db: prisma,
    repository: entityRepository,
    ownershipValidator: ownershipValidatorService,
    idUtil,
    cache: cacheService,
  },
) {
  super(deps, ...);
}
```

This pattern allows us to easily provide mock implementations during testing.

### 3.4. CRUD Controller Factory

For simple entities that follow a standard CRUD pattern, a factory is used to generate the controller, reducing boilerplate code significantly.

**File**: `src/controllers/base/base-controller.factory.ts`

**Example Usage (`EntityController`)**:

```typescript
// src/controllers/entity.controller.ts
import { createCRUDController } from './base/base-controller.factory';

const entityController = createCRUDController({
  path: '/entities',
  tag: 'Entity',
  entityName: 'Entity',
  service: entityService,
  dtoSchema: UpsertEntityDto,
  responseSchema: EntityDto,
  listResponseSchema: EntityListResponseDto,
  querySchema: ListEntitiesQueryDto,
});

export default entityController;
```

This single call creates the `POST /`, `GET /`, and `POST /delete-many` endpoints with validation and documentation.

## 4. Testing Strategy

The new architecture is designed for easy unit testing.

**Key Principles**:
- **Mock Dependencies**: Use the interfaces to create mocks for all external dependencies of a service.
- **Test Business Logic**: Focus tests on the business logic within the service, not on the implementation details of its dependencies.
- **Use Mock Utilities**: A set of mock factories is provided to easily create mocked dependencies.

**File**: `test/utils/mocks/service-mocks.ts`

**Example Test (`EntityService`)**:

```typescript
// test/unit/services/entity.service.test.ts
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { EntityService } from '@server/services/entity.service';
import { createServiceDependenciesMock } from '../../utils/mocks/service-mocks';

describe('EntityService', () => {
  let service: EntityService;
  let deps: ReturnType<typeof createServiceDependenciesMock<any>>;

  beforeEach(() => {
    mock.restore();
    deps = createServiceDependenciesMock<any>();
    service = new EntityService(deps as any);
  });

  it('should create a new entity', async () => {
    // Arrange: Setup mock return values
    deps.repository.create.mockResolvedValue({ ... });

    // Act: Call the service method
    const result = await service.upsert('user-1', { ... });

    // Assert: Check if the correct methods were called and result is correct
    expect(deps.repository.create).toHaveBeenCalled();
    expect(result.name).toBe('Test Entity');
  });
});
```

## 5. How to Add a New Entity (Step-by-Step)

1.  **Prisma Schema**: Define the model in a `.prisma` file.
2.  **DTOs**: Create DTOs (Data Transfer Objects) with validation schemas in the `src/dto` directory.
3.  **Select Object**: Define a Prisma `select` object in `src/services/selects.ts` to ensure consistent data retrieval.
4.  **Repository**: Create a new `YourEntityRepository` that extends `BaseRepository`.
5.  **Service**: Create a new `YourEntityService` that extends `BaseService` and implement the abstract methods.
6.  **Controller**: 
    - If it's a simple CRUD entity, use `createCRUDController`.
    - If it has custom endpoints, create a standard Elysia controller but still use the service for business logic.
7.  **Unit Tests**: Create a new test file in `test/unit/services` and write tests for your service's business logic, using the mock utilities.

