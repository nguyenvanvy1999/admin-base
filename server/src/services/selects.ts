import type { Prisma } from '@server/generated';

export const USER_SELECT_FOR_LOGIN: Prisma.UserSelect = {
  id: true,
  username: true,
  password: true,
  name: true,
  baseCurrencyId: true,
  created: true,
  modified: true,
  settings: true,
  roles: {
    select: {
      roleId: true,
    },
  },
};

export const USER_SELECT_FOR_INFO: Prisma.UserSelect = {
  id: true,
  username: true,
  name: true,
  baseCurrencyId: true,
  settings: true,
  roles: {
    select: {
      roleId: true,
    },
  },
};

export const USER_SELECT_FOR_VALIDATION: Prisma.UserSelect = {
  id: true,
  username: true,
  password: true,
  name: true,
  baseCurrencyId: true,
};
