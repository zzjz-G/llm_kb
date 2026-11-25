import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/common/database/drizzle.constants';
import type { PostgresJsDatabase } from '@server/common/database/database.module';
import { operationLogs } from '@server/database/tables';
import { count, asc, inArray } from 'drizzle-orm';
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

    await this.pruneToLimit(500);
  }

  private async pruneToLimit(limit: number): Promise<void> {
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(operationLogs);
    const excess = total - limit;
    if (excess <= 0) return;

    const oldRows = await this.db
      .select({ id: operationLogs.id })
      .from(operationLogs)
      .orderBy(asc(operationLogs.createdAt))
      .limit(excess);

    if (oldRows.length === 0) return;

    await this.db
      .delete(operationLogs)
      .where(inArray(operationLogs.id, oldRows.map((row) => row.id)));
  }
}
