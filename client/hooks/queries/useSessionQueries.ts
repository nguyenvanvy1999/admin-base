import { sessionService } from '@client/services';
import { z } from 'zod';
import { createQueryHook } from './createQueryHook';

const filterSchema = z.object({
  userId: z.string().optional(),
  revoked: z.enum(['all', 'active', 'revoked']).optional(),
});

export type FilterFormValue = z.infer<typeof filterSchema>;

type ListSessionsQuery = {
  userId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'expired' | 'revoked';
  sortOrder?: 'asc' | 'desc';
  revoked?: boolean;
};

export const useSessionsQuery = createQueryHook<
  typeof filterSchema,
  FilterFormValue,
  {
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'expired' | 'revoked';
    sortOrder?: 'asc' | 'desc';
  },
  ListSessionsQuery,
  any
>({
  queryKey: 'admin-sessions',
  serviceMethod: (query) => sessionService.listSessions(query),
  filterTransformer: (criteria, query) => {
    let revoked: boolean | undefined;
    if (criteria.revoked === 'active') {
      revoked = false;
    } else if (criteria.revoked === 'revoked') {
      revoked = true;
    }

    return {
      ...query,
      userId: criteria.userId?.trim() || undefined,
      revoked,
    };
  },
});
