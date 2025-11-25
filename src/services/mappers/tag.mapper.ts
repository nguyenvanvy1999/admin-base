import type { Prisma } from '@server/generated';
import { dateToIsoString } from '@server/share';
import type { TagResponse } from '../../dto/tag.dto';
import type { TAG_SELECT_FULL } from '../selects';

type TagRecord = Prisma.TagGetPayload<{ select: typeof TAG_SELECT_FULL }>;

export const mapTag = (tag: TagRecord): TagResponse => ({
  ...tag,
  description: tag.description ?? null,
  created: dateToIsoString(tag.created),
  modified: dateToIsoString(tag.modified),
});
