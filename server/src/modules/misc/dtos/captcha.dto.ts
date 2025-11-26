import { t } from 'elysia';

export const generateCaptchaDto = t.Object({
  type: t.Optional(t.Union([t.Literal('text'), t.Literal('math')])),
  size: t.Optional(t.Number({ minimum: 3, maximum: 8 })),
  width: t.Optional(t.Number({ minimum: 100, maximum: 300 })),
  height: t.Optional(t.Number({ minimum: 30, maximum: 100 })),
  noise: t.Optional(t.Number({ minimum: 0, maximum: 5 })),
  color: t.Optional(t.Boolean()),
  background: t.Optional(t.String()),
  fontSize: t.Optional(t.Number({ minimum: 20, maximum: 50 })),
  // Math captcha specific options
  mathMin: t.Optional(t.Number({ minimum: 1, maximum: 20 })),
  mathMax: t.Optional(t.Number({ minimum: 1, maximum: 20 })),
  mathOperator: t.Optional(
    t.Union([t.Literal('+'), t.Literal('-'), t.Literal('+-')]),
  ),
});

export const verifyCaptchaDto = t.Object({
  token: t.String({ minLength: 1 }),
  userInput: t.String({ minLength: 1 }),
});

export const captchaResponseDto = t.Object({
  success: t.Boolean(),
  data: t.Object({
    token: t.String(),
    svg: t.String(),
  }),
});

export const captchaVerifyResponseDto = t.Object({
  success: t.Boolean(),
  data: t.Object({
    isValid: t.Boolean(),
  }),
});
