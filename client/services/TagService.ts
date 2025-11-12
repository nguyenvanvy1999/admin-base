import { ServiceBase } from '@client/libs/ServiceBase';
import type { TagFormData } from '@client/types/tag';
import type {
  TagDeleteResponse,
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

  createTag(data: Omit<TagFormData, 'id'>): Promise<TagResponse> {
    return this.post<TagResponse>(data);
  }

  updateTag(data: TagFormData & { id: string }): Promise<TagResponse> {
    return this.patch<TagResponse>(data, {
      endpoint: data.id,
    });
  }

  deleteTag(tagId: string): Promise<TagDeleteResponse> {
    return this.delete<TagDeleteResponse>({
      endpoint: tagId,
    });
  }
}

export const tagService = new TagService();
