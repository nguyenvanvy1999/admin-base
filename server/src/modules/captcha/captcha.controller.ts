import { Elysia } from 'elysia';
import {
  captchaResponseDto,
  captchaVerifyResponseDto,
  generateCaptchaDto,
  verifyCaptchaDto,
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
      query: generateCaptchaDto,
      response: {
        200: captchaResponseDto,
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
      body: verifyCaptchaDto,
      response: {
        200: captchaVerifyResponseDto,
      },
      detail: {
        summary: 'Verify captcha',
        description: 'Verify user input against generated captcha',
        tags: ['Captcha'],
      },
    },
  );
