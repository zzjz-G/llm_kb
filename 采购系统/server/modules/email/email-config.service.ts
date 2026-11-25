import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/common/database/drizzle.constants';
import type { PostgresJsDatabase } from '@server/common/database/database.module';
import { eq, desc } from 'drizzle-orm';
import { emailConfig } from '@server/database/tables';
import type {
  EmailConfigInfo,
  SaveEmailConfigRequest,
} from '@shared/api.interface';
import { LogService } from '@server/common/log/log.service';

function mapEmailConfig(row: typeof emailConfig.$inferSelect): EmailConfigInfo {
  return {
    id: row.id,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpUser: row.smtpUser,
    smtpSecure: row.smtpSecure,
    senderName: row.senderName,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class EmailConfigService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly logService: LogService,
  ) {}

  async getActiveConfig(): Promise<EmailConfigInfo | null> {
    const rows: (typeof emailConfig.$inferSelect)[] = await this.db
      .select()
      .from(emailConfig)
      .where(eq(emailConfig.isActive, true))
      .limit(1);
    return rows.length > 0 ? mapEmailConfig(rows[0]) : null;
  }

  async getActiveConfigWithPass(): Promise<
    (typeof emailConfig.$inferSelect) | null
  > {
    const rows: (typeof emailConfig.$inferSelect)[] = await this.db
      .select()
      .from(emailConfig)
      .where(eq(emailConfig.isActive, true))
      .limit(1);
    return rows.length > 0 ? rows[0] : null;
  }

  async getConfig(): Promise<EmailConfigInfo | null> {
    const rows: (typeof emailConfig.$inferSelect)[] = await this.db
      .select()
      .from(emailConfig)
      .orderBy(desc(emailConfig.createdAt))
      .limit(1);
    return rows.length > 0 ? mapEmailConfig(rows[0]) : null;
  }

  async saveConfig(
    dto: SaveEmailConfigRequest,
    operatorId: string,
    operatorName: string,
  ): Promise<EmailConfigInfo> {
    const saved = await this.db.transaction(async (tx) => {
      if (dto.isActive) {
        await tx
          .update(emailConfig)
          .set({ isActive: false })
          .where(eq(emailConfig.isActive, true));
      }
      const inserted: (typeof emailConfig.$inferSelect)[] = await tx
        .insert(emailConfig)
        .values({
          smtpHost: dto.smtpHost,
          smtpPort: dto.smtpPort,
          smtpUser: dto.smtpUser,
          smtpPass: dto.smtpPass,
          smtpSecure: dto.smtpSecure,
          senderName: dto.senderName,
          isActive: dto.isActive,
        })
        .returning();
      return inserted[0];
    });

    await this.logService.record(
      operatorId,
      operatorName,
      'save_email_config',
      'email_config',
      saved.id,
      `保存邮件配置：${dto.smtpHost}:${dto.smtpPort}（${dto.isActive ? '激活' : '未激活'}）`,
    );

    return mapEmailConfig(saved);
  }
}
