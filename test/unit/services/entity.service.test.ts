import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { EntityType } from '@server/generated';
import { EntityService } from '@server/services/entity.service';
import { ErrorCode } from '@server/share';
import { createServiceDependenciesMock } from '../../utils/mocks/service-mocks';

// Mock the throwAppError function from the '@server/share' module
const mockThrowAppError = mock();
mock.module('@server/share', () => ({
  ...require('@server/share'), // Use require for original module in Bun
  throwAppError: mockThrowAppError,
}));

describe('EntityService', () => {
  let service: EntityService;
  let deps: ReturnType<typeof createServiceDependenciesMock<any>>;

  beforeEach(() => {
    mock.restore(); // Use Bun's mock restore
    deps = createServiceDependenciesMock<any>();
    service = new EntityService(deps as any);
  });

  describe('upsert', () => {
    const userId = 'user-1';
    const entityData = {
      name: 'Test Entity',
      type: 'company' as EntityType,
    };

    it('should create a new entity if id is not provided', async () => {
      const newEntity = {
        id: 'entity_test_id',
        ...entityData,
        userId,
        created: new Date(),
        modified: new Date(),
        phone: null,
        email: null,
        address: null,
        note: null,
        accounts: [],
      };
      deps.repository.create.mockResolvedValue(newEntity);
      deps.idUtil.dbId.mockReturnValue('entity_test_id');
      deps.repository.countByUserId.mockResolvedValue(0);

      const result = await service.upsert(userId, entityData);

      expect(deps.repository.create).toHaveBeenCalled();
      expect(result.id).toBe('entity_test_id');
      expect(result.name).toBe(entityData.name);
    });

    it('should update an existing entity if id is provided', async () => {
      const entityId = 'entity-1';
      const updatedData = {
        ...entityData,
        id: entityId,
        name: 'Updated Entity',
      };
      const existingEntity = {
        id: entityId,
        userId,
        created: new Date(),
        modified: new Date(),
        accounts: [],
      };
      const updatedEntity = { ...existingEntity, ...updatedData };

      deps.repository.findByIdAndUserId.mockResolvedValue(existingEntity);
      deps.repository.countByUserId.mockResolvedValue(0);
      deps.repository.update.mockResolvedValue(updatedEntity);

      const result = await service.upsert(userId, updatedData);

      expect(deps.repository.findByIdAndUserId).toHaveBeenCalledWith(
        entityId,
        userId,
      );
      expect(deps.repository.update).toHaveBeenCalledWith(entityId, {
        name: updatedData.name,
        type: updatedData.type,
        phone: null,
        email: null,
        address: null,
        note: null,
      });
      expect(result.name).toBe('Updated Entity');
    });

    it('should throw an error if name is duplicated', async () => {
      deps.repository.countByUserId.mockResolvedValue(1);

      // Since throwAppError is mocked, the function won't actually throw.
      // We just call it and then check if the mock was called.
      await service.upsert(userId, entityData);

      expect(deps.repository.countByUserId).toHaveBeenCalledWith(userId, {
        name: entityData.name,
      });
      expect(mockThrowAppError).toHaveBeenCalledWith(
        ErrorCode.DUPLICATE_NAME,
        'Entity name already exists',
      );
    });
  });

  describe('list', () => {
    it('should return a paginated list of entities', async () => {
      const userId = 'user-1';
      const query = { page: 1, limit: 10 };
      const entities = [
        {
          id: '1',
          name: 'Entity 1',
          created: new Date(),
          modified: new Date(),
          accounts: [],
        },
        {
          id: '2',
          name: 'Entity 2',
          created: new Date(),
          modified: new Date(),
          accounts: [],
        },
      ];
      deps.repository.findManyByUserId.mockResolvedValue(entities as any);
      deps.repository.countByUserId.mockResolvedValue(2);

      const result = await service.list(userId, query);

      expect(result.entities.length).toBe(2);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('deleteMany', () => {
    const userId = 'user-1';
    const ids = ['entity-1', 'entity-2'];

    it('should delete multiple entities successfully', async () => {
      deps.repository.findManyByIdsAndUserId.mockResolvedValue([
        { id: 'entity-1' },
        { id: 'entity-2' },
      ] as any);
      deps.repository.deleteMany.mockResolvedValue(2);

      const result = await service.deleteMany(userId, ids);

      expect(result.success).toBe(true);
    });

    it('should throw an error if some entities are not found', async () => {
      deps.repository.findManyByIdsAndUserId.mockResolvedValue([
        { id: 'entity-1' },
      ] as any);

      await service.deleteMany(userId, ids);

      expect(mockThrowAppError).toHaveBeenCalledWith(
        ErrorCode.NOT_FOUND,
        'Some Entitys were not found or do not belong to you',
      );
    });
  });
});
