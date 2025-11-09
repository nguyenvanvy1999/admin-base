import type { EntityType } from '@server/generated/prisma/enums';

export type EntityFull = {
  id: string;
  name: string;
  type: EntityType | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EntityFormData = {
  id?: string;
  name: string;
  type: EntityType;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
};
