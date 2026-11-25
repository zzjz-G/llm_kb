// /* 模板代码 仅作示例 */
// import { Injectable, Inject, Logger } from '@nestjs/common';
// import { DRIZZLE_DATABASE } from '@server/common/database/drizzle.constants';
// import type { PostgresJsDatabase } from '@server/common/database/database.module';
// import { record } from '@server/database/tables';
// import { eq, and, desc } from 'drizzle-orm';

// @Injectable()
// export class HelloService {
//   private readonly logger = new Logger(HelloService.name);

//   constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

//   async test(userId: string, limit: number = 5, type?: string) {
//     try {
//       const conditions = [eq(record.userProfile, userId)];
//       if (type) conditions.push(eq(record.type, type));
//       const results = await this.db
//         .select()
//         .from(record)
//         .where(and(...conditions))
//         .orderBy(desc(record.speakDate))
//         .limit(limit);
  
//       return results;
//     } catch (error) {
//       this.logger.error('获取最近记录失败', error);
//       throw error;
//     }
//   }
// }