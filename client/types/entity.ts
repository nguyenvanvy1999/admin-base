import type { EntityResponse } from '@server/dto/entity.dto';
import type { EntityType } from '@server/generated/prisma/enums';

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
