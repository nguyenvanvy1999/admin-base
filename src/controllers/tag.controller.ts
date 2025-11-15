import { authCheck } from '@server/services/auth/auth.middleware';
import { Elysia, t } from 'elysia';
import { ActionResDto, DeleteManyDto } from '../dto/common.dto';
import {
  ListTagsQueryDto,
  TagDto,
  TagListResponseDto,
  UpsertTagDto,
} from '../dto/tag.dto';
import { tagService } from '../services/tag.service';
import { castToRes, ResWrapper } from '../share';

const TAG_DETAIL = {
  tags: ['Tag'],
  security: [{ JwtAuth: [] }],
};

const tagController = new Elysia().group(
  '/tags',
  {
    detail: {
      tags: ['Tag'],
      description:
        'Tag management endpoints for creating, reading, updating, and deleting tags.',
    },
  },
  (group) =>
    group
      .use(authCheck)
      .post(
        '/',
        async ({ currentUser, body }) => {
          return castToRes(await tagService.upsertTag(currentUser.id, body));
        },
        {
          detail: {
            ...TAG_DETAIL,
            summary: 'Create or update tag',
            description:
              'Create a new tag or update an existing tag for the authenticated user. If a tag ID is provided, it will update the existing tag; otherwise, it creates a new one.',
          },
          body: UpsertTagDto,
          response: {
            200: ResWrapper(TagDto),
          },
        },
      )
      .get(
        '/:id',
        async ({ currentUser, params }) => {
          return castToRes(await tagService.getTag(currentUser.id, params.id));
        },
        {
          detail: {
            ...TAG_DETAIL,
            summary: 'Get tag by ID',
            description:
              'Retrieve detailed information about a specific tag by its ID for the authenticated user.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(TagDto),
          },
        },
      )
      .get(
        '/',
        async ({ currentUser, query }) => {
          return castToRes(await tagService.listTags(currentUser.id, query));
        },
        {
          detail: {
            ...TAG_DETAIL,
            summary: 'List all tags',
            description:
              'Get a paginated list of all tags belonging to the authenticated user. Supports filtering and sorting.',
          },
          query: ListTagsQueryDto,
          response: {
            200: ResWrapper(TagListResponseDto),
          },
        },
      )
      .delete(
        '/:id',
        async ({ currentUser, params }) => {
          return castToRes(
            await tagService.deleteTag(currentUser.id, params.id),
          );
        },
        {
          detail: {
            ...TAG_DETAIL,
            summary: 'Delete tag',
            description:
              'Permanently delete a tag by its ID. This action cannot be undone.',
          },
          params: t.Object({ id: t.String() }),
          response: {
            200: ResWrapper(ActionResDto),
          },
        },
      )
      .post(
        '/delete-many',
        async ({ currentUser, body }) => {
          return castToRes(
            await tagService.deleteManyTags(currentUser.id, body.ids),
          );
        },
        {
          detail: {
            ...TAG_DETAIL,
            summary: 'Delete many tags',
            description:
              'Permanently delete multiple tags by their IDs. This action cannot be undone.',
          },
          body: DeleteManyDto,
          response: {
            200: ResWrapper(ActionResDto),
          },
        },
      ),
);

export default tagController;
