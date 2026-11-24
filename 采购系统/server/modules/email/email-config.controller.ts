import {
  Controller,
  Get,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { EmailConfigService } from './email-config.service';
import { EmailService } from './email.service';
import { SaveEmailConfigDto, TestEmailDto } from './dto/email-config.dto';
import type {
  EmailConfigInfo,
  EmailSendResult,
} from '@shared/api.interface';
import { Roles } from '@server/common/jwt/auth.middleware';
import type { AuthenticatedRequest } from '@server/common/jwt/auth.middleware';
import { LogService } from '@server/common/log/log.service';

@Controller('api/email')
export class EmailConfigController {
  constructor(
    private readonly emailConfigService: EmailConfigService,
    private readonly emailService: EmailService,
    private readonly logService: LogService,
  ) {}

  @Get('config')
  @Roles(['admin'])
  async getConfig(): Promise<EmailConfigInfo | null> {
    return this.emailConfigService.getConfig();
  }

  @Post('config')
  @Roles(['admin'])
  async saveConfig(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SaveEmailConfigDto,
  ): Promise<EmailConfigInfo> {
    const { userId, name } = req.user;
    return this.emailConfigService.saveConfig(dto, userId, name);
  }

  @Post('test')
  @Roles(['admin'])
  async testEmail(
    @Req() req: AuthenticatedRequest,
    @Body() dto: TestEmailDto,
  ): Promise<EmailSendResult> {
    const { userId, name } = req.user;
    const result = await this.emailService.sendEmail(
      dto.toEmail,
      '课题组采购系统 - 测试邮件',
      `<div style="padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <h2 style="color: #1a3a5c;">课题组采购系统 - 测试邮件</h2>
        <p>您好，</p>
        <p>这是一封来自课题组耗材采购与库存管理系统的测试邮件。</p>
        <p>如果您收到了这封邮件，说明 SMTP 邮件服务配置正确，可以正常使用。</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="color: #888; font-size: 12px;">此邮件由系统自动发送，请勿直接回复。</p>
      </div>`,
    );

    await this.logService.record(
      userId,
      name,
      'test_email',
      'email',
      undefined,
      `发送测试邮件至 ${dto.toEmail}，结果：${result.success ? '成功' : '失败 - ' + (result.message ?? '')}`,
    );

    return result;
  }
}
