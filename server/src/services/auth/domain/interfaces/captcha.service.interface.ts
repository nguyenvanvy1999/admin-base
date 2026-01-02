export interface ICaptchaService {
  validateCaptcha(params: {
    token: string;
    userInput: string;
  }): Promise<boolean>;
}
