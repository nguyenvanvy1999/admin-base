import { captchaCache, type ICaptchaCache } from '@server/configs/cache';
import { type IdGen, idUtil } from 'src/share';
import svgCaptcha from 'svg-captcha';

export interface CaptchaOptions {
  size?: number;
  ignoreChars?: string;
  noise?: number;
  color?: boolean;
  background?: string;
  width?: number;
  height?: number;
  fontSize?: number;
}

export interface CaptchaResult {
  token: string;
  data: string;
  text: string;
}

export interface SvgCaptchaGenerator {
  create(options: Record<string, unknown>): { data: string; text: string };
  createMathExpr(options: Record<string, unknown>): {
    data: string;
    text: string;
  };
}

export class CaptchaService {
  constructor(
    private readonly deps: {
      cache: ICaptchaCache;
      svg: SvgCaptchaGenerator;
      tokenGen: IdGen;
    } = {
      cache: captchaCache,
      svg: svgCaptcha,
      tokenGen: idUtil.token16,
    },
  ) {}

  async generateCaptcha(options: CaptchaOptions = {}): Promise<CaptchaResult> {
    const defaultOptions = {
      size: 4,
      ignoreChars: '0o1i',
      noise: 2,
      color: true,
      background: '#f0f0f0',
      width: 150,
      height: 50,
      fontSize: 30,
      ...options,
    };
    const captcha = this.deps.svg.create(defaultOptions);
    const token = this.deps.tokenGen('captcha');
    await this.deps.cache.set(token, captcha.text);
    return { token, data: captcha.data, text: captcha.text };
  }

  async generateMathCaptcha(
    options: CaptchaOptions & {
      mathMin?: number;
      mathMax?: number;
      mathOperator?: '+' | '-' | '+-';
    } = {},
  ): Promise<CaptchaResult> {
    const defaultOptions = {
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
      mathOperator: '+' as const,
      ...options,
    };
    const captcha = this.deps.svg.createMathExpr(defaultOptions);
    const token = this.deps.tokenGen('captcha');
    await this.deps.cache.set(token, captcha.text);
    return { token, data: captcha.data, text: captcha.text };
  }

  async validateCaptcha({
    token,
    userInput,
  }: {
    token: string;
    userInput: string;
  }): Promise<boolean> {
    const cachedText = await this.deps.cache.get(token);
    if (!cachedText) {
      return false;
    }
    await this.deps.cache.del(token);
    return cachedText.toLowerCase() === userInput.toLowerCase();
  }
}

export const captchaService = new CaptchaService();
