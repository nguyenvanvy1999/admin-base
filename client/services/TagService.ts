import { ServiceBase } from '@client/libs/ServiceBase';
import type { ActionRes } from '@server/dto/common.dto';
import type {
  IUpsertTagDto,
  TagListResponse,
  TagResponse,
} from '@server/dto/tag.dto';

export class TagService extends ServiceBase {
  constructor() {
    super('/api/tags');
  }

  listTags(query?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<TagListResponse> {
    return this.get<TagListResponse>({
      params: query,
    });
  }

  createTag(data: Omit<IUpsertTagDto, 'id'>): Promise<TagResponse> {
    return this.post<TagResponse>(data);
  }

  updateTag(data: IUpsertTagDto & { id: string }): Promise<TagResponse> {
    return this.patch<TagResponse>(data, {
      endpoint: data.id,
    });
  }

  deleteManyTags(ids: string[]): Promise<ActionRes> {
    return this.post<ActionRes>(
      { ids },
      {
        endpoint: 'delete-many',
      },
    );
  }
}

export const tagService = new TagService();
