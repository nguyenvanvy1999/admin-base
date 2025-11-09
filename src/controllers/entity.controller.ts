import { UserRole } from '@server/generated/prisma/enums';
import { Elysia, t } from 'elysia';
import { ListEntitiesQueryDto, UpsertEntityDto } from '../dto/entity.dto';
import authMacro from '../macros/auth';
import entityService from '../services/entity.service';

const entityController = new Elysia().group('/entities', (group) =>
  group
    .use(entityService)
    .use(authMacro)
    .post(
      '/',
      async ({ user, body, entityService }) => {
        return await entityService.upsertEntity(user.id, body);
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          tags: ['Entity'],
          security: [{ JwtAuth: [] }],
        },
        body: UpsertEntityDto,
      },
    )
    .get(
      '/:id',
      async ({ user, params, entityService }) => {
        return await entityService.getEntity(user.id, params.id);
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          tags: ['Entity'],
          security: [{ JwtAuth: [] }],
        },
        params: t.Object({ id: t.String() }),
      },
    )
    .get(
      '/',
      async ({ user, query, entityService }) => {
        return await entityService.listEntities(user.id, query);
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          tags: ['Entity'],
          security: [{ JwtAuth: [] }],
        },
        query: ListEntitiesQueryDto,
      },
    )
    .delete(
      '/:id',
      async ({ user, params, entityService }) => {
        return await entityService.deleteEntity(user.id, params.id);
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          tags: ['Entity'],
          security: [{ JwtAuth: [] }],
        },
        params: t.Object({ id: t.String() }),
      },
    ),
);

export default entityController;
