import { z } from 'zod';

export const DeleteManyDto = z.object({
  ids: z.array(z.string()).min(1),
});

export type IDeleteManyDto = z.infer<typeof DeleteManyDto>;
