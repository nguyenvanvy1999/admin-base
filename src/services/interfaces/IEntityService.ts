import type { ActionRes } from '@server/dto/common.dto';
import type {
  EntityListResponse,
  EntityResponse,
  IListEntitiesQueryDto,
  IUpsertEntityDto,
} from '@server/dto/entity.dto';

export interface IEntityService {
  upsertEntity(userId: string, data: IUpsertEntityDto): Promise<EntityResponse>;
  getEntity(userId: string, entityId: string): Promise<EntityResponse>;
  listEntities(
    userId: string,
    query: IListEntitiesQueryDto,
  ): Promise<EntityListResponse>;
  deleteManyEntities(userId: string, ids: string[]): Promise<ActionRes>;
}
