import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { ICaptchaCache } from 'src/config/cache';
import {
  CaptchaService,
  type SvgCaptchaGenerator,
} from 'src/services/auth/captcha.service';
import { idUtil } from 'src/share';

describe('CaptchaService', () => {
  let cache: {
    set: ReturnType<typeof mock>;
    get: ReturnType<typeof mock>;
    del: ReturnType<typeof mock>;
  } & ICaptchaCache;
  let svg: {
    create: ReturnType<typeof mock>;
    createMathExpr: ReturnType<typeof mock>;
  } & SvgCaptchaGenerator;
  let service: CaptchaService;

  beforeEach(() => {
    cache = {
      set: mock(async () => undefined),
      get: mock(async () => null),
      del: mock(async () => undefined),
    } as unknown as ICaptchaCache & {
      set: ReturnType<typeof mock>;
      get: ReturnType<typeof mock>;
      del: ReturnType<typeof mock>;
    };
    svg = {
      create: mock(() => ({ data: '<svg>ABC</svg>', text: 'aBc1' })),
      createMathExpr: mock(() => ({ data: '<svg>1+2</svg>', text: '3' })),
    };
    service = new CaptchaService({
      cache,
      svg,
      idUtil,
    });
  });

  describe('generateCaptcha', () => {
    it('generates captcha with defaults, caches text, and returns token/data/text', async () => {
      const result = await service.generateCaptcha();
      expect(svg.create).toHaveBeenCalledTimes(1);
      const calledWith = svg.create.mock.calls[0]?.[0];
      expect(calledWith).toMatchObject({
        size: 4,
        ignoreChars: '0o1i',
        noise: 2,
        color: true,
        background: '#f0f0f0',
        width: 150,
        height: 50,
        fontSize: 30,
      });
      expect(cache.set).toHaveBeenCalledTimes(1);
      const [tokenArg, valueArg] = cache.set.mock.calls[0] ?? [];
      expect(tokenArg).toBe(result.token);
      expect(valueArg).toBe('aBc1');
      expect(result.data).toBe('<svg>ABC</svg>');
      expect(result.text).toBe('aBc1');
    });

    it('passes overrides to svg.create', async () => {
      await service.generateCaptcha({
        size: 6,
        ignoreChars: 'xyz',
        noise: 4,
        color: false,
        background: '#fff',
        width: 200,
        height: 80,
        fontSize: 40,
      });
      const calledWith = svg.create.mock.calls[0]?.[0];
      expect(calledWith).toMatchObject({
        size: 6,
        ignoreChars: 'xyz',
        noise: 4,
        color: false,
        background: '#fff',
        width: 200,
        height: 80,
        fontSize: 40,
      });
    });

    it('rejects if svg.create throws and does not cache', () => {
      svg.create.mockImplementation(() => {
        throw new Error('svg error');
      });
      expect(service.generateCaptcha()).rejects.toThrow('svg error');
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('rejects if cache.set fails', () => {
      cache.set.mockImplementation(() => {
        throw new Error('set failed');
      });
      const svc = new CaptchaService({
        cache: cache as unknown as ICaptchaCache,
        svg,
        idUtil,
      });
      expect(svc.generateCaptcha()).rejects.toThrow('set failed');
      expect(svg.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateMathCaptcha', () => {
    it('generates math captcha with defaults and caches text', async () => {
      const result = await service.generateMathCaptcha();
      expect(svg.createMathExpr).toHaveBeenCalledTimes(1);
      const calledWith = svg.createMathExpr.mock.calls[0]?.[0];
      expect(calledWith).toMatchObject({
        size: 4,
        ignoreChars: '0o1i',
        noise: 2,
        color: true,
        background: '#f0f0f0',
        width: 150,
        height: 50,
        fontSize: 30,
        mathMin: 1,
        mathMax: 9,
        mathOperator: '+',
      });
      expect(cache.set).toHaveBeenCalledTimes(1);
      const [tokenArg, valueArg] = cache.set.mock.calls[0] ?? [];
      expect(tokenArg).toBe(result.token);
      expect(valueArg).toBe('3');
      expect(result.data).toBe('<svg>1+2</svg>');
      expect(result.text).toBe('3');
    });

    it('passes overrides to svg.createMathExpr including math params', async () => {
      await service.generateMathCaptcha({
        size: 5,
        noise: 1,
        color: false,
        background: '#000',
        width: 120,
        height: 40,
        fontSize: 22,
        mathMin: 2,
        mathMax: 5,
        mathOperator: '+-',
      });
      const calledWith = svg.createMathExpr.mock.calls[0]?.[0];
      expect(calledWith).toMatchObject({
        size: 5,
        noise: 1,
        color: false,
        background: '#000',
        width: 120,
        height: 40,
        fontSize: 22,
        mathMin: 2,
        mathMax: 5,
        mathOperator: '+-',
      });
    });

    it('rejects if svg.createMathExpr throws and does not cache', () => {
      svg.createMathExpr.mockImplementation(() => {
        throw new Error('math svg error');
      });
      expect(service.generateMathCaptcha()).rejects.toThrow('math svg error');
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('rejects if cache.set fails', () => {
      cache.set.mockImplementation(() => {
        throw new Error('set failed');
      });
      const svc = new CaptchaService({
        cache: cache as unknown as ICaptchaCache,
        svg,
        idUtil,
      });
      expect(svc.generateMathCaptcha()).rejects.toThrow('set failed');
      expect(svg.createMathExpr).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateCaptcha', () => {
    it('returns false and does not delete when token missing', async () => {
      const ok = await service.validateCaptcha({
        token: 'missing',
        userInput: 'abc',
      });
      expect(ok).toBe(false);
      expect(cache.del).not.toHaveBeenCalled();
    });

    it('returns true on case-insensitive match and deletes token', async () => {
      const { token, text } = await service.generateCaptcha();
      cache.get.mockResolvedValueOnce(text);
      const mixed = text
        .split('')
        .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
        .join('');
      const ok = await service.validateCaptcha({ token, userInput: mixed });
      expect(ok).toBe(true);
      expect(cache.del).toHaveBeenCalledWith(token);
    });

    it('returns false on mismatch and deletes token', async () => {
      const { token, text } = await service.generateCaptcha();
      cache.get.mockResolvedValueOnce(text);
      const ok = await service.validateCaptcha({ token, userInput: 'wrong' });
      expect(ok).toBe(false);
      expect(cache.del).toHaveBeenCalledWith(token);
    });

    it('is single-use: second validation returns false', async () => {
      const { token, text } = await service.generateCaptcha();
      cache.get.mockResolvedValueOnce(text);
      const first = await service.validateCaptcha({ token, userInput: text });
      cache.get.mockResolvedValueOnce(null);
      const second = await service.validateCaptcha({ token, userInput: text });
      expect(first).toBe(true);
      expect(second).toBe(false);
    });

    it('propagates error if cache.del fails', () => {
      cache.get.mockResolvedValueOnce('ABC');
      cache.del.mockImplementation(() => {
        throw new Error('del failed');
      });
      const svc = new CaptchaService({
        cache: cache as unknown as ICaptchaCache,
        svg,
        idUtil,
      });
      expect(
        svc.validateCaptcha({ token: 't', userInput: 'abc' }),
      ).rejects.toThrow('del failed');
    });
  });
});
