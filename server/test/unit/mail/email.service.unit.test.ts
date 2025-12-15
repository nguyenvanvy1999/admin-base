import { beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { EmailService } from 'src/services/mail/email.service';
import { PurposeVerify } from 'src/share';
import { createMockMailEnv } from 'test/utils/mocks/env';
import { createMockLogger } from 'test/utils/mocks/logger';
import { createMockMailer } from 'test/utils/mocks/mailer';

describe('EmailService', () => {
  const email = 'user@example.com';
  const subject = 'Subj';
  const html = '<p>Hi</p>';
  const otp = '123456';
  let service: EmailService;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockMailer: ReturnType<typeof createMockMailer>;
  const env = createMockMailEnv() as any;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockMailer = createMockMailer();
    mockMailer.createTransport.lastCreateOptions = null;
    mockMailer.transport.sendMail.setBehavior('resolve', {
      messageId: 'mid-1',
    });

    service = new EmailService({
      createTransport: mockMailer.createTransport,
      logger: mockLogger,
      env,
    });
  });

  describe('sendMail', () => {
    it('sends successfully and logs message id', async () => {
      await service.sendMail(email, subject, html);
      expect(mockMailer.createTransport).toHaveBeenCalledTimes(1);
      const createOpts = mockMailer.createTransport.lastCreateOptions;
      expect(createOpts?.host).toBe(env.MAIL_HOST);
      expect(createOpts?.port).toBe(env.MAIL_PORT);
      expect(createOpts?.secure).toBe(true);
      expect(createOpts?.auth.user).toBe(env.MAIL_USER);
      expect(createOpts?.auth.pass).toBe(env.MAIL_PASSWORD);

      expect(mockMailer.transport.sendMail).toHaveBeenCalledTimes(1);
      expect(mockMailer.transport.sendMail).toHaveBeenCalledWith({
        from: env.MAIL_FROM,
        to: email,
        subject,
        html,
      });
      expect(mockLogger.warning).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('logs error when sendMail rejects and does not throw', async () => {
      mockMailer.transport.sendMail.setBehavior(
        'reject',
        new Error('smtp down'),
      );
      await service.sendMail(email, subject, html);
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });

    it('logs error when createTransport throws and does not throw', async () => {
      mockMailer.createTransport.setThrowOnCreate(true);
      await service.sendMail(email, subject, html);
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      // no sendMail attempted
      expect(mockMailer.transport.sendMail).not.toHaveBeenCalled();
    });

    it('creates a new transporter each call', async () => {
      await service.sendMail(email, subject, html);
      await service.sendMail(email, subject, html);
      expect(mockMailer.createTransport).toHaveBeenCalledTimes(2);
      expect(mockMailer.transport.sendMail).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendEmailOtp', () => {
    it('generates OTP email HTML and sends with correct subject', async () => {
      const spy = spyOn(service, 'sendMail').mockResolvedValue(undefined);
      await service.sendEmailOtp(email, otp, PurposeVerify.REGISTER);

      expect(spy).toHaveBeenCalledTimes(1);
      const [calledEmail, calledSubject, calledHtml] = spy.mock.calls[0];
      expect(calledEmail).toBe(email);
      expect(calledSubject).toBe('Your verify code');
      expect(calledHtml).toContain(otp);
      expect(calledHtml).toContain('verify your email address');
      expect(calledHtml).toContain('One-Time Password (OTP)');
      spy.mockRestore();
    });

    it('maps purpose REGISTER correctly', async () => {
      const spy = spyOn(service, 'sendMail').mockResolvedValue(undefined);
      await service.sendEmailOtp(email, otp, PurposeVerify.REGISTER);

      const [, , html] = spy.mock.calls[0];
      expect(html).toContain('verify your email address');
      expect(html).toContain(otp);
      spy.mockRestore();
    });

    it('maps purpose FORGOT_PASSWORD correctly', async () => {
      const spy = spyOn(service, 'sendMail').mockResolvedValue(undefined);
      await service.sendEmailOtp(email, otp, PurposeVerify.FORGOT_PASSWORD);

      const [, , html] = spy.mock.calls[0];
      expect(html).toContain('reset your password');
      expect(html).toContain(otp);
      spy.mockRestore();
    });

    it('maps purpose RESET_MFA correctly', async () => {
      const spy = spyOn(service, 'sendMail').mockResolvedValue(undefined);
      await service.sendEmailOtp(email, otp, PurposeVerify.RESET_MFA);

      const [, , html] = spy.mock.calls[0];
      expect(html).toContain('reset your MFA');
      expect(html).toContain(otp);
      spy.mockRestore();
    });

    it('sends email through sendMail method', async () => {
      await service.sendEmailOtp(email, otp, PurposeVerify.REGISTER);

      expect(mockMailer.createTransport).toHaveBeenCalledTimes(1);
      expect(mockMailer.transport.sendMail).toHaveBeenCalledTimes(1);
      const sendMailCall = mockMailer.transport.sendMail.mock.calls[0][0];
      expect(sendMailCall.to).toBe(email);
      expect(sendMailCall.subject).toBe('Your verify code');
      expect(sendMailCall.html).toContain(otp);
      expect(sendMailCall.html).toContain('verify your email address');
    });
  });
});
