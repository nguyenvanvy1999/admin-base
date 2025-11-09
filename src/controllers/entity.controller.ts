import { UserRole } from '@server/generated/prisma/enums';
import { Elysia, t } from 'elysia';
import { ListEntitiesQueryDto, UpsertEntityDto } from '../dto/entity.dto';
import authMacro from '../macros/auth';
import entityService from '../services/entity.service';

const ENTITY_DETAIL = {
  tags: ['Entity'],
  security: [{ JwtAuth: [] }],
};

const entityController = new Elysia().group(
  '/entities',
  {
    detail: {
      tags: ['Entity'],
      description:
        'Entity management endpoints for creating, reading, updating, and deleting financial entities.',
    },
  },
  (group) =>
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
            ...ENTITY_DETAIL,
            summary: 'Create or update entity',
            description:
              'Create a new financial entity or update an existing entity for the authenticated user. If an entity ID is provided, it will update the existing entity; otherwise, it creates a new one.',
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
            ...ENTITY_DETAIL,
            summary: 'Get entity by ID',
            description:
              'Retrieve detailed information about a specific financial entity by its ID for the authenticated user.',
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
            ...ENTITY_DETAIL,
            summary: 'List all entities',
            description:
              'Get a paginated list of all financial entities belonging to the authenticated user. Supports filtering and sorting.',
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
            ...ENTITY_DETAIL,
            summary: 'Delete entity',
            description:
              'Permanently delete a financial entity by its ID. This action cannot be undone.',
          },
          params: t.Object({ id: t.String() }),
        },
      ),
);

export default entityController;
