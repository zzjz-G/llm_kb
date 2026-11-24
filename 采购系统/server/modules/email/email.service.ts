import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { EmailSendResult } from '@shared/api.interface';
import { EmailConfigService } from './email-config.service';
import { LogService } from '@server/common/log/log.service';

interface CachedTransporter {
  transporter: Transporter;
  configId: string;
  smtpUser: string;
  senderName: string;
}

@Injectable()
export class EmailService {
  private cached: CachedTransporter | null = null;

  constructor(
    private readonly emailConfigService: EmailConfigService,
    private readonly logService: LogService,
  ) {}

  private async getTransporter(): Promise<CachedTransporter | null> {
    const config = await this.emailConfigService.getActiveConfigWithPass();
    if (!config) {
      this.cached = null;
      return null;
    }

    if (this.cached && this.cached.configId === config.id) {
      return this.cached;
    }

    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });

    this.cached = {
      transporter,
      configId: config.id,
      smtpUser: config.smtpUser,
      senderName: config.senderName,
    };
    return this.cached;
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<EmailSendResult> {
    try {
      const cached = await this.getTransporter();
      if (!cached) {
        return { success: false, message: '邮件服务未配置' };
      }

      await cached.transporter.sendMail({
        from: `"${cached.senderName}" <${cached.smtpUser}>`,
        to,
        subject,
        html,
      });

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await this.logService.record(
        undefined,
        'system',
        'send_email_fail',
        'email',
        undefined,
        `收件人：${to}，标题：${subject}，错误：${message}`,
      );
      return { success: false, message };
    }
  }
}
