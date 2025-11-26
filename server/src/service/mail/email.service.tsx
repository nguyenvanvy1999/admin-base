import { render } from '@react-email/render';
import nodemailer, { type Transporter } from 'nodemailer';
import { env, type IEnv } from 'src/config/env';
import { type ILogger, logger } from 'src/config/logger';
import { EmailType, PurposeVerify } from 'src/share';
import { OTPEmail } from './emails/otp';

const EMAIL_SUBJECT: Record<EmailType, string> = {
  [EmailType.OTP]: 'Your verify code',
};

const EMAIL_OTP_PURPOSE: Record<PurposeVerify, string> = {
  [PurposeVerify.REGISTER]: 'verify your email address',
  [PurposeVerify.FORGOT_PASSWORD]: 'reset your password',
  [PurposeVerify.RESET_MFA]: 'reset your MFA',
};

type CreateTransportFn = (options: Record<string, any>) => Transporter;

type RenderEmailFn = (
  element: any,
  options?: Record<string, any>,
) => Promise<string>;

export class EmailService {
  constructor(
    private readonly deps: {
      createTransport: CreateTransportFn;
      renderEmail: RenderEmailFn;
      logger: ILogger;
      env: IEnv;
    } = {
      createTransport: nodemailer.createTransport,
      renderEmail: render,
      logger,
      env,
    },
  ) {}

  async sendMail(email: string, subject: string, html: string): Promise<void> {
    try {
      const transporter = this.deps.createTransport({
        host: this.deps.env.MAIL_HOST,
        port: this.deps.env.MAIL_PORT,
        secure: true,
        auth: {
          user: this.deps.env.MAIL_USER,
          pass: this.deps.env.MAIL_PASSWORD,
        },
      });

      const info = await transporter.sendMail({
        from: this.deps.env.MAIL_FROM,
        to: email,
        subject,
        html,
      });

      this.deps.logger.warning(`Email sent: ${info.messageId}`);
    } catch (e) {
      this.deps.logger.error(`Send email failed to ${email} ${e}`);
    }
  }

  async sendEmailOtp(
    email: string,
    otp: string,
    purpose: PurposeVerify,
  ): Promise<void> {
    const html = await this.deps.renderEmail(
      <OTPEmail otp={otp} purpose={EMAIL_OTP_PURPOSE[purpose]} />,
    );
    await this.sendMail(email, EMAIL_SUBJECT[EmailType.OTP], html);
  }
}

export const emailService = new EmailService();
