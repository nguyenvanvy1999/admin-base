import { Elysia, t } from 'elysia';
import { fileService } from 'src/services/file/file.service';
import {
  ACCESS_AUTH,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  ResWrapper,
} from 'src/share';

export const fileController = new Elysia({
  prefix: '/file',
  tags: [DOC_TAG.FILE],
})
  .post(
    '/upload',
    async ({ body }) => {
      const fileName = await fileService.uploadFile(body.file);
      return castToRes({ url: fileName });
    },
    {
      body: t.Object({
        file: t.File({ format: 'image/*' }),
      }),
      response: {
        200: ResWrapper(t.Object({ url: t.String() })),
        400: ErrorResDto,
        500: ErrorResDto,
      },
      detail: {
        security: ACCESS_AUTH,
        summary: 'Upload file',
        description: 'Upload file',
      },
    },
  )
  .get(
    '/download/:filename',
    async ({ params }) => {
      const { filename } = params;
      const { content, contentType } = await fileService.downloadFile(filename);
      const res = new Response(content);
      res.headers.set('Content-Type', contentType.mime);
      res.headers.set(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      return res;
    },
    {
      params: t.Object({ filename: t.String({ minLength: 1 }) }),
      detail: {
        security: ACCESS_AUTH,
        summary: 'Download file',
        description: 'Download file',
        responses: {
          200: {
            description: 'File stream',
            content: {
              'application/octet-stream': {},
            },
          },
        },
      },
      response: {
        400: ErrorResDto,
        500: ErrorResDto,
      },
    },
  )
  .get(
    '/storage',
    () => {
      const status = fileService.getStorageStatus();
      return castToRes(status);
    },
    {
      detail: {
        security: ACCESS_AUTH,
        summary: 'Get current file storage status',
        description:
          'Return current storage mode, active backend and env readiness',
      },
      response: {
        200: ResWrapper(
          t.Object({
            mode: t.Union([t.Literal('s3'), t.Literal('file')]),
            current: t.Union([t.Literal('s3'), t.Literal('file')]),
            s3EnvReady: t.Boolean(),
          }),
        ),
        500: ErrorResDto,
      },
    },
  );
