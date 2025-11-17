import {
  EntityDto,
  EntityListResponseDto,
  ListEntitiesQueryDto,
  UpsertEntityDto,
} from '../dto/entity.dto';
import { entityService } from '../services/entity.service';
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
