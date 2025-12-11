import { Elysia } from 'elysia';
import {
  CaptchaResponseDto,
  CaptchaVerifyResponseDto,
  GenerateCaptchaDto,
  VerifyCaptchaDto,
} from 'src/dtos/captcha.dto';
import { captchaService } from 'src/service/misc/captcha.service';

export const captchaController = new Elysia({ prefix: '/captcha' })
  .get(
    '/generate',
    async ({ query }) => {
      const { type = 'text', ...options } = query;
      const result = await captchaService.generateByType(
        type as 'text' | 'math',
        options,
      );

      return {
        success: true,
        data: {
          token: result.token,
          svg: result.data,
        },
      };
    },
    {
      query: GenerateCaptchaDto,
      response: {
        200: CaptchaResponseDto,
      },
      detail: {
        summary: 'Generate captcha',
        description: 'Generate a new captcha (text or math expression)',
        tags: ['Captcha'],
      },
    },
  )
  .post(
    '/verify',
    async ({ body }) => {
      const { token, userInput } = body;

      const isValid = await captchaService.validateCaptcha({
        token,
        userInput,
      });

      return {
        success: true,
        data: {
          isValid,
        },
      };
    },
    {
      body: VerifyCaptchaDto,
      response: {
        200: CaptchaVerifyResponseDto,
      },
      detail: {
        summary: 'Verify captcha',
        description: 'Verify user input against generated captcha',
        tags: ['Captcha'],
      },
    },
  );
