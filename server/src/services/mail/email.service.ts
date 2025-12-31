import nodemailer, { type Transporter } from 'nodemailer';
import { env, type IEnv } from 'src/config/env';
import { type ILogger, logger } from 'src/config/logger';
import { EmailType, PurposeVerify } from 'src/share';

const EMAIL_SUBJECT: Record<EmailType, string> = {
  [EmailType.OTP]: 'Your verify code',
};

const EMAIL_OTP_PURPOSE: Record<PurposeVerify, string> = {
  [PurposeVerify.REGISTER]: 'verify your email address',
  [PurposeVerify.FORGOT_PASSWORD]: 'reset your password',
  [PurposeVerify.RESET_MFA]: 'reset your MFA',
  [PurposeVerify.MFA_LOGIN]: 'verify your login',
  [PurposeVerify.DEVICE_VERIFY]: 'verify your device',
};

type CreateTransportFn = (options: Record<string, any>) => Transporter;

function generateOtpEmailHtml(otp: string, purpose: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="min-height: 100vh; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 400px; background-color: #f9fafb; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); padding: 24px;">
          <tr>
            <td align="center" style="padding-bottom: 16px;">
              <p style="margin: 0; font-size: 14px; font-weight: 500; color: #7c3aed;">
                One-Time Password (OTP)
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 16px;">
              <p style="margin: 0; color: #4b5563; font-size: 14px; text-align: center; line-height: 1.5;">
                Use the code below to ${purpose}.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 16px 0 8px 0;">
              <p style="margin: 0; font-size: 48px; font-weight: bold; letter-spacing: 8px; color: #111827;">
                ${otp}
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 16px;">
              <p style="margin: 0; color: #9ca3af; font-weight: 300; font-size: 12px;">
                This code will expire in 5 minutes
              </p>
            </td>
          </tr>
          <tr>
            <td align="center">
              <p style="margin: 0; color: #4b5563; font-size: 12px; line-height: 1.5;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export class EmailService {
  constructor(
    private readonly deps: {
      createTransport: CreateTransportFn;
      logger: ILogger;
      env: IEnv;
    } = {
      createTransport: nodemailer.createTransport,
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
    const html = generateOtpEmailHtml(otp, EMAIL_OTP_PURPOSE[purpose]);
    await this.sendMail(email, EMAIL_SUBJECT[EmailType.OTP], html);
  }
}

export const emailService = new EmailService();
