import { ActionResDto, DeleteManyDto } from '@server/dto/common.dto';
import { authCheck } from '@server/services/auth/auth.middleware';
import type { IBaseService } from '@server/services/base/base.service';
import { castToRes, ResWrapper } from '@server/share';
import { Elysia, type t } from 'elysia';
import { createControllerDetail } from './controller-detail.factory';

/**
 * Configuration for the CRUD controller factory.
 */
export interface CRUDControllerConfig<TDto, TResponse, TListResponse> {
  path: string;
  tag: string;
  entityName: string;
  service: IBaseService<TDto, TResponse, TListResponse>;
  dtoSchema: t.AnySchema;
  responseSchema: t.AnySchema;
  listResponseSchema: t.AnySchema;
  querySchema?: t.AnySchema;
}

/**
 * Factory function to create a standardized CRUD controller.
 * This reduces boilerplate code for common create, list, and delete-many endpoints.
 *
 * @param config - The configuration object for the controller.
 * @returns An Elysia instance with the configured CRUD routes.
 */
export function createCRUDController<TDto, TResponse, TListResponse>(
  config: CRUDControllerConfig<TDto, TResponse, TListResponse>,
) {
  const DETAIL = createControllerDetail(config.entityName);

  return new Elysia().group(
    config.path,
    {
      detail: {
        tags: [config.tag],
        description: `${config.entityName} management endpoints`,
      },
    },
    (group) =>
      group
        .use(authCheck)
        .post(
          '/',
          async ({ currentUser, body }) => {
            // The body needs to be cast to TDto because Elysia's body is generic
            return castToRes(
              await config.service.upsert(currentUser.id, body as TDto),
            );
          },
          {
            detail: {
              ...DETAIL,
              summary: `Create or update ${config.entityName.toLowerCase()}`,
            },
            body: config.dtoSchema,
            response: {
              200: ResWrapper(config.responseSchema),
            },
          },
        )
        .get(
          '/',
          async ({ currentUser, query }) => {
            return castToRes(await config.service.list(currentUser.id, query));
          },
          {
            detail: {
              ...DETAIL,
              summary: `List all ${config.entityName.toLowerCase()}s`,
            },
            query: config.querySchema,
            response: {
              200: ResWrapper(config.listResponseSchema),
            },
          },
        )
        .post(
          '/delete-many',
          async ({ currentUser, body }) => {
            return castToRes(
              await config.service.deleteMany(currentUser.id, body.ids),
            );
          },
          {
            detail: {
              ...DETAIL,
              summary: `Delete many ${config.entityName.toLowerCase()}s`,
            },
            body: DeleteManyDto,
            response: {
              200: ResWrapper(ActionResDto),
            },
          },
        ),
  );
}
