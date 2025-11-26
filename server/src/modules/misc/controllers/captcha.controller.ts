import { Elysia } from 'elysia';
import { captchaService } from 'src/service/misc/captcha.service';
import {
  captchaResponseDto,
  captchaVerifyResponseDto,
  generateCaptchaDto,
  verifyCaptchaDto,
} from '../dtos';

export const captchaController = new Elysia({ prefix: '/captcha' })
  .get(
    '/generate',
    async ({ query }) => {
      const { type = 'text', ...options } = query;

      let result;
      if (type === 'math') {
        result = await captchaService.generateMathCaptcha(options);
      } else {
        result = await captchaService.generateCaptcha(options);
      }

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
