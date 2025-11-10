import type { TagResponse } from '@server/src/dto/tag.dto';

export type TagFull = TagResponse;

export type TagFormData = {
  id?: string;
  name: string;
  description?: string;
};
