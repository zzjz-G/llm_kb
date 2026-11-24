import { Injectable, Inject } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, ilike, count, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { operationLogs } from '@server/database/schema';
import type {
  OperationLog,
  LogListResponse,
  LogQuery,
  LogAction,
} from '@shared/api.interface';

type LogRow = typeof operationLogs.$inferSelect;

@Injectable()
export class LogsService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private toOperationLog(row: LogRow): OperationLog {
    return {
      id: row.id,
      operatorId: row.operatorId ?? undefined,
      operatorName: row.operatorName,
      action: row.action as LogAction,
      targetType: row.targetType,
      targetId: row.targetId ?? undefined,
      detail: row.detail ?? undefined,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async list(query: LogQuery): Promise<LogListResponse> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
    const offset = (page - 1) * pageSize;

    const conditions: SQL[] = [];

    if (query.action) {
      conditions.push(eq(operationLogs.action, query.action));
    }
    if (query.targetType) {
      conditions.push(eq(operationLogs.targetType, query.targetType));
    }
    if (query.operatorName) {
      conditions.push(ilike(operationLogs.operatorName, `%${query.operatorName}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(operationLogs)
        .where(whereClause)
        .orderBy(desc(operationLogs.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(operationLogs)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      items: rows.map((row: LogRow) => this.toOperationLog(row)),
      total,
      page,
      pageSize,
    };
  }
}
