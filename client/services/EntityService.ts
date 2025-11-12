import { ServiceBase } from '@client/libs/ServiceBase';
import type { EntityFormData } from '@client/types/entity';
import type {
  EntityDeleteResponse,
  EntityListResponse,
  EntityResponse,
} from '@server/dto/entity.dto';

export class EntityService extends ServiceBase {
  constructor() {
    super('/api/entities');
  }

  listEntities(query?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<EntityListResponse> {
    return this.get<EntityListResponse>({
      params: query,
    });
  }

  createEntity(data: Omit<EntityFormData, 'id'>): Promise<EntityResponse> {
    return this.post<EntityResponse>(data);
  }

  updateEntity(data: EntityFormData): Promise<EntityResponse> {
    return this.post<EntityResponse>(data);
  }

  async deleteEntity(entityId: string): Promise<EntityDeleteResponse> {
    return this.delete<EntityDeleteResponse>({
      endpoint: entityId,
    });
  }
}

export const entityService = new EntityService();
