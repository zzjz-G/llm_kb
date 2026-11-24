import { Injectable } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { Inject } from '@nestjs/common';
import { operationLogs } from '@server/database/schema';
import type { LogAction } from '@shared/api.interface';

@Injectable()
export class LogService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async record(
    operatorId: string | undefined,
    operatorName: string,
    action: LogAction,
    targetType: string,
    targetId?: string,
    detail?: string,
  ): Promise<void> {
    await this.db.insert(operationLogs).values({
      operatorId: operatorId ?? undefined,
      operatorName,
      action,
      targetType,
      targetId: targetId ?? undefined,
      detail: detail ?? undefined,
    });
  }
}
