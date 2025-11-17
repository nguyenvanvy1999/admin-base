# Kế hoạch Tái cấu trúc Backend

## 🎯 Mục tiêu

1. **Loại bỏ API không sử dụng**: Xác định và xóa các API get by id không được FE sử dụng
2. **Phân chia code hợp lý**: Tổ chức code theo các layer rõ ràng (Controller → Service → Repository)
3. **Dễ mock test (DI)**: Áp dụng Dependency Injection pattern nhất quán
4. **Dễ đọc và maintain**: Code rõ ràng, có structure pattern
5. **Tránh code duplication**: Tạo base classes và utility functions chung

## 📊 Phân tích hiện trạng

### ✅ Điểm tốt hiện tại

1. **Đã có DI pattern**: Nhiều service đã sử dụng constructor injection
2. **Có BaseRepository**: Đã có base class cho repository
3. **Có OwnershipValidatorService**: Service validation ownership tập trung
4. **Có CacheService**: Service cache tập trung
5. **Controller structure tốt**: Sử dụng Elysia group và detail factory

### ⚠️ Vấn đề cần giải quyết

1. **API không sử dụng**:
   - `GET /categories/:id` - FE không gọi (chỉ dùng list)
   - `GET /accounts/:id` - FE không gọi (chỉ dùng list)
   - `GET /tags/:id` - FE không gọi (chỉ dùng list)
   - `GET /entities/:id` - FE không gọi (chỉ dùng list)
   - Các API này vẫn có trong BE nhưng FE không sử dụng

2. **Code duplication trong Service**:
   ```typescript
   // Pattern lặp lại trong nhiều service:
   - validateOwnership()
   - validateUniqueName()
   - upsertEntity/Tag/Event pattern
   - listEntities/Tags/Events pattern (pagination, filtering, sorting)
   - deleteManyEntities/Tags/Events pattern
   - formatEntity/Tag/Event pattern
   ```

3. **Inconsistent DI**:
   - Một số service có DI đầy đủ (AccountService, CategoryService)
   - Một số service DI không đầy đủ (TagService, EntityService, EventService)
   - Cần chuẩn hóa pattern

4. **Repository pattern chưa đồng nhất**:
   - Chỉ có AccountRepository và TransactionRepository
   - Các entity khác truy cập trực tiếp prisma trong service
   - Cần tạo repository cho tất cả entity

## 🏗️ Kiến trúc mới

### Layer Structure

```
┌─────────────────────────────────────────┐
│           Controller Layer              │
│  - Route handling                       │
│  - Request/Response mapping             │
│  - Authentication/Authorization         │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│            Service Layer                │
│  - Business logic                       │
│  - Validation                           │
│  - Orchestration                        │
│  - Transaction management               │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│          Repository Layer               │
│  - Data access                          │
│  - Query building                       │
│  - Database operations                  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│           Database (Prisma)             │
└─────────────────────────────────────────┘
```

### Dependency Injection Pattern

```typescript
// Service với DI đầy đủ
export class EntityService {
  constructor(
    private readonly deps: {
      db: IDb;
      idUtil: IdUtil;
      repository: EntityRepository;
      ownershipValidator: OwnershipValidatorService;
      cache: CacheService;
    } = {
      db: prisma,
      idUtil,
      repository: entityRepository,
      ownershipValidator: ownershipValidatorService,
      cache: cacheService,
    },
  ) {}
}
```

## 📋 Chi tiết kế hoạch thực hiện

### Phase 1: Phân tích và Cleanup (1-2 ngày)

#### 1.1. Xác định API không sử dụng

**Phương pháp**:
- Grep tất cả các service methods trong FE
- So sánh với BE endpoints
- Tạo danh sách API không dùng

**API cần xem xét xóa**:
```typescript
// Các API get by id không được FE sử dụng:
- GET /api/categories/:id
- GET /api/accounts/:id  
- GET /api/tags/:id
- GET /api/entities/:id

// Giữ lại các API get by id được sử dụng:
✓ GET /api/investments/:id (được dùng)
✓ GET /api/budgets/:id (được dùng)
✓ GET /api/events/:id (được dùng)
```

**Action items**:
- [ ] Tạo script để scan FE service calls
- [ ] Tạo báo cáo API usage
- [ ] Review với team trước khi xóa
- [ ] Xóa các API không dùng (controller + service method)

#### 1.2. Document API còn lại

- [ ] Update Swagger documentation
- [ ] Update API reference docs

### Phase 2: Tạo Base Classes (2-3 ngày)

#### 2.1. BaseRepository

**File**: `src/repositories/base/base.repository.ts`

```typescript
export interface IBaseRepository<T, TSelect> {
  findById(id: string): Promise<T | null>;
  findByIdAndUserId(id: string, userId: string): Promise<T | null>;
  findMany(where: any, orderBy: any, skip: number, take: number): Promise<T[]>;
  count(where: any): Promise<number>;
  create(data: any): Promise<T>;
  update(id: string, data: any): Promise<T>;
  delete(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<number>;
}

export abstract class BaseRepository<T, TSelect> implements IBaseRepository<T, TSelect> {
  constructor(
    protected readonly db: IDb,
    protected readonly modelName: string,
    protected readonly select: TSelect,
  ) {}

  // Implement common CRUD methods
  async findByIdAndUserId(id: string, userId: string): Promise<T | null> {
    return this.db[this.modelName].findFirst({
      where: { id, userId },
      select: this.select,
    }) as Promise<T | null>;
  }

  // ... other common methods
}
```

**Benefits**:
- Giảm code duplication trong repository
- Dễ test với mock
- Type-safe với generics

#### 2.2. BaseService

**File**: `src/services/base/base.service.ts`

```typescript
export interface IBaseService<TDto, TListResponse> {
  upsert(userId: string, data: TDto): Promise<any>;
  getById(userId: string, id: string): Promise<any>;
  list(userId: string, query: any): Promise<TListResponse>;
  deleteMany(userId: string, ids: string[]): Promise<ActionRes>;
}

export abstract class BaseService<
  TEntity,
  TDto,
  TListResponse,
  TRepository extends IBaseRepository<any, any>
> implements IBaseService<TDto, TListResponse> {
  
  constructor(
    protected readonly deps: {
      repository: TRepository;
      ownershipValidator: OwnershipValidatorService;
      idUtil: IdUtil;
      cache?: CacheService;
    },
    protected readonly config: {
      entityName: string;
      dbPrefix: string;
    },
  ) {}

  // Common validation methods
  protected async validateOwnership(userId: string, id: string): Promise<void> {
    const entity = await this.deps.repository.findByIdAndUserId(id, userId);
    if (!entity) {
      throwAppError(
        ErrorCode.NOT_FOUND,
        `${this.config.entityName} not found`,
      );
    }
  }

  protected async validateUniqueName(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    // Common implementation
  }

  // Common CRUD methods
  abstract upsert(userId: string, data: TDto): Promise<any>;
  abstract getById(userId: string, id: string): Promise<any>;
  abstract list(userId: string, query: any): Promise<TListResponse>;
  
  async deleteMany(userId: string, ids: string[]): Promise<ActionRes> {
    // Common implementation
    const entities = await this.deps.repository.findManyByIdsAndUserId(ids, userId);
    
    if (entities.length !== ids.length) {
      throwAppError(
        ErrorCode.NOT_FOUND,
        `Some ${this.config.entityName}s were not found`,
      );
    }

    await this.deps.repository.deleteMany(ids);

    return {
      success: true,
      message: `${ids.length} ${this.config.entityName}(s) deleted successfully`,
    };
  }
}
```

**Benefits**:
- Tập trung business logic chung
- Giảm code duplication
- Dễ extend cho specific logic

#### 2.3. Utility Functions

**File**: `src/share/utils/service.util.ts`

```typescript
// Common formatting functions
export const createDateFormatter = () => ({
  toIsoString: (date: Date | null): string | null => 
    date ? date.toISOString() : null,
});

export const createDecimalFormatter = () => ({
  toString: (decimal: Decimal): string => decimal.toString(),
  toNullableString: (decimal: Decimal | null): string | null =>
    decimal ? decimal.toString() : null,
});

// Common validation functions
export const createNameValidator = (db: IDb, modelName: string) => ({
  async validateUniqueName(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const where: any = { userId, name };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    const count = await db[modelName].count({ where });
    if (count > 0) {
      throwAppError(ErrorCode.DUPLICATE_NAME, `${modelName} name already exists`);
    }
  },
});

// Pagination helper
export const createPaginationHelper = () => ({
  calculateSkip: (page: number, limit: number) => (page - 1) * limit,
  
  createPaginationResponse: (page: number, limit: number, total: number) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }),
});
```

### Phase 3: Tạo Repositories (2-3 ngày)

#### 3.1. Tạo Repository cho từng entity

**Cần tạo**:
- [ ] `CategoryRepository`
- [ ] `EntityRepository`
- [ ] `TagRepository`
- [ ] `EventRepository`
- [ ] `BudgetRepository`
- [ ] `InvestmentRepository`
- [ ] `TradeRepository`
- [ ] `ContributionRepository`
- [ ] `ValuationRepository`

**Template**:

```typescript
// src/repositories/entity.repository.ts
export class EntityRepository extends BaseRepository<
  EntityRecord,
  typeof ENTITY_SELECT_FULL
> {
  constructor(db: IDb = prisma) {
    super(db, 'entity', ENTITY_SELECT_FULL);
  }

  // Specific methods for Entity
  async findByName(userId: string, name: string) {
    return this.db.entity.findFirst({
      where: { userId, name },
      select: this.select,
    });
  }
}

export const entityRepository = new EntityRepository();
```

### Phase 4: Refactor Services (3-4 ngày)

#### 4.1. Refactor từng service để extend BaseService

**Ví dụ: EntityService**

```typescript
export class EntityService extends BaseService<
  EntityRecord,
  IUpsertEntityDto,
  EntityListResponse,
  EntityRepository
> {
  constructor(
    deps: {
      repository: EntityRepository;
      ownershipValidator: OwnershipValidatorService;
      idUtil: IdUtil;
      cache: CacheService;
    } = {
      repository: entityRepository,
      ownershipValidator: ownershipValidatorService,
      idUtil,
      cache: cacheService,
    },
  ) {
    super(deps, {
      entityName: 'Entity',
      dbPrefix: DB_PREFIX.ENTITY,
    });
  }

  async upsert(userId: string, data: IUpsertEntityDto) {
    if (data.id) {
      await this.validateOwnership(userId, data.id);
    }

    await this.validateUniqueName(userId, data.name, data.id);

    if (data.id) {
      return this.deps.repository.update(data.id, {
        name: data.name,
        type: data.type,
        phone: data.phone ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        note: data.note ?? null,
      });
    } else {
      return this.deps.repository.create({
        id: this.deps.idUtil.dbId(this.config.dbPrefix),
        userId,
        name: data.name,
        type: data.type,
        phone: data.phone ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        note: data.note ?? null,
      });
    }
  }

  async getById(userId: string, id: string) {
    const entity = await this.deps.repository.findByIdAndUserId(id, userId);
    if (!entity) {
      throwAppError(ErrorCode.ENTITY_NOT_FOUND, 'Entity not found');
    }
    return this.formatEntity(entity);
  }

  async list(userId: string, query: IListEntitiesQueryDto) {
    // Implementation using repository
  }

  private formatEntity(entity: EntityRecord) {
    return {
      ...entity,
      created: entity.created.toISOString(),
      modified: entity.modified.toISOString(),
    };
  }
}
```

**Services cần refactor**:
- [ ] CategoryService
- [ ] EntityService
- [ ] TagService
- [ ] EventService
- [ ] AccountService (đã tốt, chỉ cần adjust)
- [ ] BudgetService
- [ ] InvestmentService
- [ ] TradeService
- [ ] ContributionService
- [ ] ValuationService

### Phase 5: Tạo Interfaces cho Testing (1-2 ngày)

#### 5.1. Tạo interfaces cho dependencies

**File**: `src/services/base/interfaces.ts`

```typescript
export interface IIdUtil {
  dbId(prefix: string): string;
  nanoid(size?: number): string;
}

export interface IDb {
  [model: string]: any;
  $transaction: (callback: any) => Promise<any>;
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
}

export interface IOwnershipValidatorService {
  validateAccountOwnership(userId: string, accountId: string, select?: any): Promise<any>;
  validateCategoryOwnership(userId: string, categoryId: string): Promise<any>;
  validateEntityOwnership(userId: string, entityId: string): Promise<any>;
  validateEventOwnership(userId: string, eventId: string): Promise<any>;
  validateBudgetOwnership(userId: string, budgetId: string): Promise<any>;
  validateTransactionOwnership(userId: string, transactionId: string): Promise<any>;
}

export interface ICacheService {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
}
```

#### 5.2. Update services để sử dụng interfaces

```typescript
export class EntityService extends BaseService<...> {
  constructor(
    deps: {
      repository: IEntityRepository;  // Interface instead of concrete class
      ownershipValidator: IOwnershipValidatorService;
      idUtil: IIdUtil;
      cache: ICacheService;
    } = {
      repository: entityRepository,
      ownershipValidator: ownershipValidatorService,
      idUtil,
      cache: cacheService,
    },
  ) {
    super(deps, config);
  }
}
```

### Phase 6: Chuẩn hóa Controllers (1 ngày)

#### 6.1. Tạo BaseController factory

**File**: `src/controllers/base/base-controller.factory.ts`

```typescript
export interface CRUDControllerConfig<TDto, TResponse, TListResponse> {
  path: string;
  tag: string;
  entityName: string;
  service: IBaseService<TDto, TListResponse>;
  dtoSchema: any;
  responseSchema: any;
  listResponseSchema: any;
  querySchema?: any;
}

export function createCRUDController<TDto, TResponse, TListResponse>(
  config: CRUDControllerConfig<TDto, TResponse, TListResponse>
) {
  const DETAIL = createControllerDetail(config.entityName);

  return new Elysia().group(
    config.path,
    {
      detail: {
        tags: [config.tag],
        description: `${config.entityName} management endpoints`,
      },
    },
    (group) =>
      group
        .use(authCheck)
        .post(
          '/',
          async ({ currentUser, body }) => {
            return castToRes(
              await config.service.upsert(currentUser.id, body)
            );
          },
          {
            detail: {
              ...DETAIL,
              summary: `Create or update ${config.entityName.toLowerCase()}`,
            },
            body: config.dtoSchema,
            response: {
              200: ResWrapper(config.responseSchema),
            },
          },
        )
        .get(
          '/',
          async ({ currentUser, query }) => {
            return castToRes(
              await config.service.list(currentUser.id, query)
            );
          },
          {
            detail: {
              ...DETAIL,
              summary: `List all ${config.entityName.toLowerCase()}s`,
            },
            query: config.querySchema,
            response: {
              200: ResWrapper(config.listResponseSchema),
            },
          },
        )
        .post(
          '/delete-many',
          async ({ currentUser, body }) => {
            return castToRes(
              await config.service.deleteMany(currentUser.id, body.ids)
            );
          },
          {
            detail: {
              ...DETAIL,
              summary: `Delete many ${config.entityName.toLowerCase()}s`,
            },
            body: DeleteManyDto,
            response: {
              200: ResWrapper(ActionResDto),
            },
          },
        ),
  );
}
```

**Usage**:

```typescript
// src/controllers/entity.controller.ts
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

### Phase 7: Testing (2-3 ngày)

#### 7.1. Tạo mock utilities

**File**: `test/utils/mocks/service-mocks.ts`

```typescript
import { mock } from 'bun:test';

export function createRepositoryMock<T>() {
  return {
    findById: mock(async () => null),
    findByIdAndUserId: mock(async () => null),
    findMany: mock(async () => []),
    count: mock(async () => 0),
    create: mock(async (data: any) => data),
    update: mock(async (id: string, data: any) => data),
    delete: mock(async () => undefined),
    deleteMany: mock(async () => 0),
  };
}

export function createServiceDependenciesMock() {
  return {
    repository: createRepositoryMock(),
    ownershipValidator: {
      validateEntityOwnership: mock(async () => ({ id: 'test-id', userId: 'test-user' })),
    },
    idUtil: {
      dbId: mock((prefix: string) => `${prefix}_test_id`),
      nanoid: mock(() => 'test_nanoid'),
    },
    cache: {
      get: mock(() => undefined),
      set: mock(() => undefined),
      delete: mock(() => undefined),
      clear: mock(() => undefined),
    },
  };
}
```

#### 7.2. Viết unit tests mẫu

**File**: `test/unit/services/entity.service.test.ts`

```typescript
import { describe, expect, it, beforeEach } from 'bun:test';
import { EntityService } from '@server/services/entity.service';
import { createServiceDependenciesMock } from '@test/utils/mocks/service-mocks';

describe('EntityService', () => {
  let service: EntityService;
  let mocks: ReturnType<typeof createServiceDependenciesMock>;

  beforeEach(() => {
    mocks = createServiceDependenciesMock();
    service = new EntityService(mocks as any);
  });

  describe('upsert', () => {
    it('should create new entity when id is not provided', async () => {
      const userId = 'user-1';
      const data = {
        name: 'Test Entity',
        type: 'company',
      };

      mocks.repository.create.mockResolvedValue({
        id: 'entity-1',
        ...data,
        userId,
      });

      const result = await service.upsert(userId, data);

      expect(mocks.repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: data.name,
          type: data.type,
          userId,
        })
      );
      expect(result).toMatchObject(data);
    });

    it('should update existing entity when id is provided', async () => {
      const userId = 'user-1';
      const data = {
        id: 'entity-1',
        name: 'Updated Entity',
        type: 'company',
      };

      mocks.ownershipValidator.validateEntityOwnership.mockResolvedValue({
        id: data.id,
        userId,
      });

      mocks.repository.update.mockResolvedValue({
        ...data,
        userId,
      });

      const result = await service.upsert(userId, data);

      expect(mocks.ownershipValidator.validateEntityOwnership).toHaveBeenCalledWith(
        userId,
        data.id
      );
      expect(mocks.repository.update).toHaveBeenCalledWith(
        data.id,
        expect.objectContaining({
          name: data.name,
          type: data.type,
        })
      );
    });
  });

  describe('getById', () => {
    it('should return entity when found', async () => {
      const userId = 'user-1';
      const entityId = 'entity-1';
      const entity = {
        id: entityId,
        userId,
        name: 'Test Entity',
        type: 'company',
        created: new Date(),
        modified: new Date(),
      };

      mocks.repository.findByIdAndUserId.mockResolvedValue(entity);

      const result = await service.getById(userId, entityId);

      expect(mocks.repository.findByIdAndUserId).toHaveBeenCalledWith(
        entityId,
        userId
      );
      expect(result).toMatchObject({
        id: entityId,
        name: entity.name,
      });
    });

    it('should throw error when entity not found', async () => {
      const userId = 'user-1';
      const entityId = 'entity-1';

      mocks.repository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.getById(userId, entityId)).rejects.toThrow(
        'Entity not found'
      );
    });
  });

  describe('deleteMany', () => {
    it('should delete multiple entities', async () => {
      const userId = 'user-1';
      const ids = ['entity-1', 'entity-2'];

      mocks.repository.findManyByIdsAndUserId.mockResolvedValue([
        { id: 'entity-1', userId },
        { id: 'entity-2', userId },
      ]);

      mocks.repository.deleteMany.mockResolvedValue(2);

      const result = await service.deleteMany(userId, ids);

      expect(mocks.repository.findManyByIdsAndUserId).toHaveBeenCalledWith(
        ids,
        userId
      );
      expect(mocks.repository.deleteMany).toHaveBeenCalledWith(ids);
      expect(result.success).toBe(true);
      expect(result.message).toContain('2');
    });

    it('should throw error when some entities not found', async () => {
      const userId = 'user-1';
      const ids = ['entity-1', 'entity-2'];

      mocks.repository.findManyByIdsAndUserId.mockResolvedValue([
        { id: 'entity-1', userId },
      ]);

      await expect(service.deleteMany(userId, ids)).rejects.toThrow(
        'Some Entitys were not found'
      );
    });
  });
});
```

### Phase 8: Documentation (1 ngày)

#### 8.1. Tạo Architecture Documentation

**File**: `docs/project/backend-architecture.md`

Nội dung:
- Layer structure
- Dependency injection pattern
- Repository pattern
- Service pattern
- Testing strategy
- Code examples

#### 8.2. Tạo Development Guide

**File**: `docs/project/backend-development-guide.md`

Nội dung:
- How to create new entity
- How to write tests
- Best practices
- Common patterns

## 📈 Timeline tổng thể

| Phase | Task | Duration | Priority |
|-------|------|----------|----------|
| 1 | Phân tích và Cleanup | 1-2 ngày | High |
| 2 | Tạo Base Classes | 2-3 ngày | High |
| 3 | Tạo Repositories | 2-3 ngày | High |
| 4 | Refactor Services | 3-4 ngày | High |
| 5 | Tạo Interfaces | 1-2 ngày | Medium |
| 6 | Chuẩn hóa Controllers | 1 ngày | Medium |
| 7 | Testing | 2-3 ngày | High |
| 8 | Documentation | 1 ngày | Medium |

**Tổng thời gian ước tính**: 13-18 ngày làm việc (2.5-3.5 tuần)

## [object Object]s Metrics

1. **Code Quality**:
   - [ ] Giảm 50% code duplication
   - [ ] 100% services có DI pattern
   - [ ] 100% entities có repository

2. **Testing**:
   - [ ] 80%+ test coverage cho services
   - [ ] Tất cả services có unit tests
   - [ ] Mock tests chạy < 1s

3. **Maintainability**:
   - [ ] Thêm entity mới chỉ cần < 30 phút
   - [ ] Code review time giảm 30%
   - [ ] Onboarding time cho dev mới giảm 50%

4. **Performance**:
   - [ ] API response time không tăng
   - [ ] Memory usage không tăng
   - [ ] Database query count không tăng

## 🚀 Migration Strategy

### Approach: Incremental Migration

1. **Không breaking changes**: Refactor từng service một, không ảnh hưởng API
2. **Backward compatible**: Giữ nguyên API contract
3. **Test thoroughly**: Test kỹ trước khi merge
4. **Monitor**: Monitor performance sau mỗi refactor

### Rollout Plan

**Week 1-2**: Foundation
- Tạo base classes
- Tạo repositories
- Setup testing infrastructure

**Week 2-3**: Migration
- Refactor services (2-3 services/day)
- Write tests
- Code review

**Week 3-4**: Finalization
- Cleanup unused APIs
- Documentation
- Final testing
- Deploy

## 📝 Notes

### Các điểm cần lưu ý

1. **Không xóa API ngay**: Đánh dấu deprecated trước, xóa sau 1-2 sprint
2. **Test coverage**: Ưu tiên test cho business logic quan trọng
3. **Performance**: Monitor query performance sau refactor
4. **Team sync**: Daily sync để resolve blockers
5. **Documentation**: Update docs song song với code

### Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes | High | Comprehensive testing, gradual rollout |
| Performance regression | Medium | Benchmark before/after, monitoring |
| Team learning curve | Low | Pair programming, documentation |
| Timeline overrun | Medium | Prioritize high-impact changes first |

## 🔄 Next Steps

1. [ ] Review kế hoạch với team
2. [ ] Estimate effort chi tiết hơn
3. [ ] Setup tracking (Jira/Linear)
4. [ ] Kickoff meeting
5. [ ] Start Phase 1

---

**Document version**: 1.0  
**Last updated**: 2025-11-17  
**Author**: Backend Team  
**Status**: Draft - Pending Review

