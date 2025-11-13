import { Elysia, t } from 'elysia';
import {
  DeleteManyTagsDto,
  ListTagsQueryDto,
  TagDeleteResponseDto,
  TagDto,
  TagListResponseDto,
  UpsertTagDto,
} from '../dto/tag.dto';
import { authCheck } from '../service/auth/auth.middleware';
import tagService from '../services/tag.service';
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
      .use(tagService)
      .use(authCheck)
      .post(
        '/',
        async ({ currentUser, body, tagService }) => {
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
        async ({ currentUser, params, tagService }) => {
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
        async ({ currentUser, query, tagService }) => {
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
        async ({ currentUser, params, tagService }) => {
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
            200: ResWrapper(TagDeleteResponseDto),
          },
        },
      )
      .post(
        '/delete-many',
        async ({ currentUser, body, tagService }) => {
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
          body: DeleteManyTagsDto,
          response: {
            200: ResWrapper(TagDeleteResponseDto),
          },
        },
      ),
);

export default tagController;
