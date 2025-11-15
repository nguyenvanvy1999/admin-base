import { ServiceBase } from '@client/libs/ServiceBase';
import type {
  EntityDeleteResponse,
  EntityListResponse,
  EntityResponse,
  IUpsertEntityDto,
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

  createEntity(data: Omit<IUpsertEntityDto, 'id'>): Promise<EntityResponse> {
    return this.post<EntityResponse>(data);
  }

  updateEntity(data: IUpsertEntityDto): Promise<EntityResponse> {
    return this.post<EntityResponse>(data);
  }

  deleteManyEntities(ids: string[]): Promise<EntityDeleteResponse> {
    return this.post<EntityDeleteResponse>(
      { ids },
      {
        endpoint: 'delete-many',
      },
    );
  }
}

export const entityService = new EntityService();
