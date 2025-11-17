import { ActionResDto, DeleteManyDto } from '@server/dto/common.dto';
import { authCheck } from '@server/services/auth/auth.middleware';
import { castToRes, ResWrapper } from '@server/share';
import { Elysia, t } from 'elysia';
import { createControllerDetail } from './controller-detail.factory';

interface CRUDService<TUpsert, TResponse, TListResponse, TQuery> {
  upsert: (
    userId: string,
    data: TUpsert,
  ) => Promise<TResponse | { success: boolean; message: string }>;
  getById: (userId: string, id: string) => Promise<TResponse>;
  list: (userId: string, query: TQuery) => Promise<TListResponse>;
  deleteMany?: (
    userId: string,
    ids: string[],
  ) => Promise<{ success: boolean; message: string }>;
}

interface CRUDControllerOptions<
  TUpsertDto,
  TResponseDto,
  TListResponseDto,
  TQueryDto,
> {
  path: string;
  tag: string;
  description: string;
  service: CRUDService<any, any, any, any>;
  upsertDto: TUpsertDto;
  responseDto: TResponseDto;
  listResponseDto: TListResponseDto;
  queryDto: TQueryDto;
  usePutForUpdate?: boolean;
  customRoutes?: (
    group: ReturnType<typeof createCRUDGroup>,
  ) => ReturnType<typeof createCRUDGroup>;
}

function createCRUDGroup(elysia: Elysia) {
  return elysia.use(authCheck);
}

export function createCRUDController<
  TUpsertDto,
  TResponseDto,
  TListResponseDto,
  TQueryDto,
>(
  options: CRUDControllerOptions<
    TUpsertDto,
    TResponseDto,
    TListResponseDto,
    TQueryDto
  >,
) {
  const {
    path,
    tag,
    description,
    service,
    upsertDto,
    responseDto,
    listResponseDto,
    queryDto,
    usePutForUpdate = false,
    customRoutes,
  } = options;
  const DETAIL = createControllerDetail(tag);

  const baseGroup = new Elysia().group(path, {
    detail: {
      tags: [tag],
      description,
    },
  });

  let group = createCRUDGroup(baseGroup);

  if (usePutForUpdate) {
    group = group
      .post(
        '/',
        async ({ currentUser, body }) => {
          return castToRes(await service.upsert(currentUser.id, body));
        },
        {
          detail: {
            ...DETAIL,
            summary: `Create ${tag.toLowerCase()}`,
            description: `Create a new ${tag.toLowerCase()} for the authenticated user.`,
          },
          body: upsertDto,
          response: {
            200: ResWrapper(responseDto),
          },
        },
      )
      .put(
        '/:id',
        async ({ currentUser, params, body }) => {
          return castToRes(
            await service.upsert(currentUser.id, { ...body, id: params.id }),
          );
        },
        {
          detail: {
            ...DETAIL,
            summary: `Update ${tag.toLowerCase()}`,
            description: `Update an existing ${tag.toLowerCase()} by its ID.`,
          },
          params: t.Object({ id: t.String() }),
          body: upsertDto,
          response: {
            200: ResWrapper(responseDto),
          },
        },
      );
  } else {
    group = group.post(
      '/',
      async ({ currentUser, body }) => {
        return castToRes(await service.upsert(currentUser.id, body));
      },
      {
        detail: {
          ...DETAIL,
          summary: `Create or update ${tag.toLowerCase()}`,
          description: `Create a new ${tag.toLowerCase()} or update an existing one. If an ID is provided, it will update the existing ${tag.toLowerCase()}; otherwise, it creates a new one.`,
        },
        body: upsertDto,
        response: {
          200: ResWrapper(responseDto),
        },
      },
    );
  }

  group = group
    .get(
      '/:id',
      async ({ currentUser, params }) => {
        return castToRes(await service.getById(currentUser.id, params.id));
      },
      {
        detail: {
          ...DETAIL,
          summary: `Get ${tag.toLowerCase()} by ID`,
          description: `Retrieve detailed information about a specific ${tag.toLowerCase()} by its ID for the authenticated user.`,
        },
        params: t.Object({ id: t.String() }),
        response: {
          200: ResWrapper(responseDto),
        },
      },
    )
    .get(
      '/',
      async ({ currentUser, query }) => {
        return castToRes(await service.list(currentUser.id, query));
      },
      {
        detail: {
          ...DETAIL,
          summary: `List all ${tag.toLowerCase()}s`,
          description: `Get a paginated list of all ${tag.toLowerCase()}s belonging to the authenticated user. Supports filtering and sorting.`,
        },
        query: queryDto,
        response: {
          200: ResWrapper(listResponseDto),
        },
      },
    );

  if (service.deleteMany) {
    group = group.post(
      '/delete-many',
      async ({ currentUser, body }) => {
        return castToRes(await service.deleteMany!(currentUser.id, body.ids));
      },
      {
        detail: {
          ...DETAIL,
          summary: `Delete many ${tag.toLowerCase()}s`,
          description: `Permanently delete multiple ${tag.toLowerCase()}s by their IDs. This action cannot be undone.`,
        },
        body: DeleteManyDto,
        response: {
          200: ResWrapper(ActionResDto),
        },
      },
    );
  }

  if (customRoutes) {
    group = customRoutes(group);
  }

  return group;
}
