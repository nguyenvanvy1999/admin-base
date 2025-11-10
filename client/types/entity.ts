import type { EntityType } from '@server/generated/prisma/enums';
import type { EntityResponse } from '@server/src/dto/entity.dto';

export type EntityFull = EntityResponse;

export type EntityFormData = {
  id?: string;
  name: string;
  type: EntityType;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
};
