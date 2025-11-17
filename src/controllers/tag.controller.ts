import {
  ListTagsQueryDto,
  TagDto,
  TagListResponseDto,
  UpsertTagDto,
} from '../dto/tag.dto';
import { tagService } from '../services/tag.service';
import { createCRUDController } from './base/base-controller.factory';

const tagController = createCRUDController({
  path: '/tags',
  tag: 'Tag',
  entityName: 'Tag',
  service: tagService,
  dtoSchema: UpsertTagDto,
  responseSchema: TagDto,
  listResponseSchema: TagListResponseDto,
  querySchema: ListTagsQueryDto,
});

export default tagController;
