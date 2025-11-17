import { authCheck } from '@server/services/auth/auth.middleware';
import { Elysia, t } from 'elysia';
import { ActionResDto, DeleteManyDto } from '../dto/common.dto';
import {
  EntityDto,
  EntityListResponseDto,
  ListEntitiesQueryDto,
  UpsertEntityDto,
} from '../dto/entity.dto';
import { entityService } from '../services/entity.service';
import { castToRes, ResWrapper } from '../share';
import { createControllerDetail } from './base/controller-detail.factory';

const ENTITY_DETAIL = createControllerDetail('Entity');

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
      .use(authCheck)
      .post(
        '/',
        async ({ currentUser, body }) => {
          return castToRes(
            await entityService.upsertEntity(currentUser.id, body),
          );
        },
        {
          detail: {
            ...ENTITY_DETAIL,
            summary: 'Create or update entity',
            description:
              'Create a new financial entity or update an existing entity for the authenticated user. If an entity ID is provided, it will update the existing entity; otherwise, it creates a new one.',
          },
          body: UpsertEntityDto,
          response: {
            200: ResWrapper(EntityDto),
          },
        },
      )

      .get(
        '/',
        async ({ currentUser, query }) => {
          return castToRes(
            await entityService.listEntities(currentUser.id, query),
          );
        },
        {
          detail: {
            ...ENTITY_DETAIL,
            summary: 'List all entities',
            description:
              'Get a paginated list of all financial entities belonging to the authenticated user. Supports filtering and sorting.',
          },
          query: ListEntitiesQueryDto,
          response: {
            200: ResWrapper(EntityListResponseDto),
          },
        },
      )
      .post(
        '/delete-many',
        async ({ currentUser, body }) => {
          return castToRes(
            await entityService.deleteManyEntities(currentUser.id, body.ids),
          );
        },
        {
          detail: {
            ...ENTITY_DETAIL,
            summary: 'Delete many entities',
            description:
              'Permanently delete multiple financial entities by their IDs. This action cannot be undone.',
          },
          body: DeleteManyDto,
          response: {
            200: ResWrapper(ActionResDto),
          },
        },
      ),
);

export default entityController;
