import { type TSchema, t } from 'elysia';
import type { DeleteResponse, PaginationResponse } from '../../dto/common.dto';

export const ResWrapper = <T extends TSchema>(dataSchema: T) =>
  t.NoValidate(
    t.Object({
      data: dataSchema,
      t: t.String(),
      success: t.Boolean(),
      code: t.String(),
    }),
  );

export type PaginationType = PaginationResponse;

export type DeleteResponseType = DeleteResponse;

export interface ListResponse<T> {
  items: T[];
  pagination: PaginationType;
}

export interface ListResponseWithSummary<T, S> extends ListResponse<T> {
  summary?: S[];
}
