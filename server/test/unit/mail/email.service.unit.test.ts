import { beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { EmailService } from 'src/service/mail/email.service';
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
  const env = createMockMailEnv();

  // capture the last rendered element to inspect props
  let lastRenderedElement: any = null;
  const renderEmail = (element: any): Promise<string> => {
    lastRenderedElement = element;
    return Promise.resolve('<html>rendered</html>');
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockMailer = createMockMailer();
    // configure behavior defaults
    mockMailer.createTransport.lastCreateOptions = null;
    mockMailer.transport.sendMail.setBehavior('resolve', {
      messageId: 'mid-1',
    });
    lastRenderedElement = null;

    service = new EmailService({
      createTransport: mockMailer.createTransport,
      renderEmail,
      logger: mockLogger,
      env,
    } as any);
  });

  describe('sendMail', () => {
    it('sends successfully and logs message id', async () => {
      await service.sendMail(email, subject, html);
      expect(mockMailer.createTransport as any).toHaveBeenCalledTimes(1);
      const createOpts = (mockMailer.createTransport as any).lastCreateOptions;
      expect(createOpts.host).toBe(env.MAIL_HOST);
      expect(createOpts.port).toBe(env.MAIL_PORT);
      expect(createOpts.secure).toBe(true);
      expect(createOpts.auth.user).toBe(env.MAIL_USER);
      expect(createOpts.auth.pass).toBe(env.MAIL_PASSWORD);

      expect(mockMailer.transport.sendMail as any).toHaveBeenCalledTimes(1);
      expect(mockMailer.transport.sendMail as any).toHaveBeenCalledWith({
        from: env.MAIL_FROM,
        to: email,
        subject,
        html,
      });
      expect(mockLogger.warning).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('logs error when sendMail rejects and does not throw', async () => {
      (mockMailer.transport.sendMail as any).setBehavior(
        'reject',
        new Error('smtp down'),
      );
      await service.sendMail(email, subject, html);
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });

    it('logs error when createTransport throws and does not throw', async () => {
      (mockMailer.createTransport as any).setThrowOnCreate(true);
      await service.sendMail(email, subject, html);
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      // no sendMail attempted
      expect(mockMailer.transport.sendMail as any).not.toHaveBeenCalled();
    });

    it('creates a new transporter each call', async () => {
      await service.sendMail(email, subject, html);
      await service.sendMail(email, subject, html);
      expect(mockMailer.createTransport as any).toHaveBeenCalledTimes(2);
      expect(mockMailer.transport.sendMail as any).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendEmailOtp', () => {
    it('renders OTP email and sends with correct subject', async () => {
      const spy = spyOn(service as any, 'sendMail').mockResolvedValue(
        undefined,
      );
      await service.sendEmailOtp(email, otp, PurposeVerify.REGISTER);
      expect(lastRenderedElement).not.toBeNull();
      expect(spy).toHaveBeenCalledWith(
        email,
        'Your verify code',
        '<html>rendered</html>',
      );
      spy.mockRestore();
    });

    it('maps purpose REGISTER correctly', async () => {
      await service.sendEmailOtp(email, otp, PurposeVerify.REGISTER);
      expect(lastRenderedElement.props.purpose).toBe(
        'verify your email address',
      );
    });

    it('maps purpose FORGOT_PASSWORD correctly', async () => {
      await service.sendEmailOtp(email, otp, PurposeVerify.FORGOT_PASSWORD);
      expect(lastRenderedElement.props.purpose).toBe('reset your password');
    });

    it('maps purpose RESET_MFA correctly', async () => {
      await service.sendEmailOtp(email, otp, PurposeVerify.RESET_MFA);
      expect(lastRenderedElement.props.purpose).toBe('reset your MFA');
    });

    it('rejects when render fails and does not call sendMail', () => {
      const failingRender = () => {
        throw new Error('render failed');
      };
      service = new EmailService({
        createTransport: mockMailer.createTransport,
        renderEmail: failingRender,
        logger: mockLogger,
        env,
      } as any);
      const spy = spyOn(service, 'sendMail').mockResolvedValue(undefined);
      expect(
        service.sendEmailOtp(email, otp, PurposeVerify.REGISTER),
      ).rejects.toThrow();
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
