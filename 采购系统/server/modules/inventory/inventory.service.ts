import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/common/database/drizzle.constants';
import type { PostgresJsDatabase } from '@server/common/database/database.module';
import { eq, and, ilike, sql, count, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { inventory } from '@server/database/tables';
import { LogService } from '@server/common/log/log.service';
import { HazardousChemicalsService } from '@server/modules/hazardous-chemicals/hazardous-chemicals.service';
import * as XLSX from 'xlsx';
import {
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
  HAZARDOUS_OPTIONS,
  HAZARDOUS_LABELS,
} from '@shared/api.interface';
import type {
  InventoryItem,
  InventoryListResponse,
  CreateInventoryRequest,
  UpdateInventoryRequest,
  ConsumeInventoryRequest,
  InventoryQuery,
  MaterialCategory,
  HazardousOption,
  InventoryImportResult,
  InventoryImportRowError,
} from '@shared/api.interface';

type InventoryRow = typeof inventory.$inferSelect;

@Injectable()
export class InventoryService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly logService: LogService,
    private readonly hazchemService: HazardousChemicalsService,
  ) {}

  async detectHazardous(
    materialName: string,
    cas?: string,
  ): Promise<'yes' | 'no'> {
    return this.hazchemService.detectHazardous(materialName, cas);
  }

  private toInventoryItem(row: InventoryRow, withPrice: boolean): InventoryItem {
    const base: Omit<InventoryItem, 'inUnitPrice' | 'inTotalPrice'> & {
      inUnitPrice?: number;
      inTotalPrice?: number;
    } = {
      id: row.id,
      materialName: row.materialName,
      category: row.category as MaterialCategory,
      specification: row.specification ?? undefined,
      casNo: row.casNo ?? undefined,
      isHazardous: (row.isHazardous ?? undefined) as InventoryItem['isHazardous'],
      purity: row.purity ?? undefined,
      purchaseChannel: row.purchaseChannel ?? undefined,
      purchaseLink: row.purchaseLink ?? undefined,
      applicant: row.applicant ?? undefined,
      inTime: row.inTime.toISOString(),
      inQuantity: Number(row.inQuantity),
      storageLocation: row.storageLocation ?? undefined,
      remainingQuantity: Number(row.remainingQuantity),
      remark: row.remark ?? undefined,
      sourceOrderId: row.sourceOrderId ?? undefined,
      sourceItemId: row.sourceItemId ?? undefined,
    };

    if (withPrice) {
      base.inUnitPrice =
        row.inUnitPrice != null ? Number(row.inUnitPrice) : undefined;
      base.inTotalPrice =
        row.inTotalPrice != null ? Number(row.inTotalPrice) : undefined;
    }

    return base as InventoryItem;
  }

  async list(
    query: InventoryQuery,
    isAdmin: boolean,
  ): Promise<InventoryListResponse> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
    const offset = (page - 1) * pageSize;

    const conditions: SQL[] = [];

    if (query.category) {
      conditions.push(eq(inventory.category, query.category));
    }
    if (query.storageLocation) {
      conditions.push(eq(inventory.storageLocation, query.storageLocation));
    }
    if (query.applicant) {
      conditions.push(ilike(inventory.applicant, `%${query.applicant}%`));
    }
    if (query.casNo) {
      conditions.push(ilike(inventory.casNo, `%${query.casNo}%`));
    }
    if (query.keyword) {
      const kw = `%${query.keyword}%`;
      conditions.push(
        sql`(${inventory.materialName} ilike ${kw}
          OR ${inventory.casNo} ilike ${kw}
          OR ${inventory.storageLocation} ilike ${kw}
          OR ${inventory.applicant} ilike ${kw})`,
      );
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(inventory)
        .where(whereClause)
        .orderBy(desc(inventory.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(inventory)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      items: rows.map((row: InventoryRow) =>
        this.toInventoryItem(row, isAdmin),
      ),
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string, isAdmin: boolean): Promise<InventoryItem> {
    const rows: InventoryRow[] = await this.db
      .select()
      .from(inventory)
      .where(eq(inventory.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('库存记录不存在');
    }

    return this.toInventoryItem(rows[0], isAdmin);
  }

  async create(
    dto: CreateInventoryRequest,
    operatorId: string,
    operatorName: string,
  ): Promise<InventoryItem> {
    const inTotalPrice =
      dto.inTotalPrice !== undefined && dto.inTotalPrice !== null
        ? dto.inTotalPrice
        : dto.inUnitPrice != null && dto.inQuantity != null
          ? dto.inQuantity * dto.inUnitPrice
          : undefined;

    let isHazardous = dto.isHazardous ?? null;
    if (isHazardous == null) {
      const autoHaz = await this.hazchemService.checkChemical(
        dto.materialName,
        dto.casNo ?? undefined,
      );
      isHazardous = autoHaz.isHazardous ? 'yes' : 'no';
    }

    const values: Record<string, unknown> = {
      materialName: dto.materialName,
      category: dto.category,
      specification: dto.specification ?? null,
      casNo: dto.casNo ?? null,
      isHazardous,
      purity: dto.purity ?? null,
      purchaseChannel: dto.purchaseChannel ?? null,
      purchaseLink: dto.purchaseLink ?? null,
      applicant: dto.applicant ?? null,
      inQuantity: String(dto.inQuantity),
      inUnitPrice:
        dto.inUnitPrice != null ? String(dto.inUnitPrice) : null,
      inTotalPrice:
        inTotalPrice != null ? String(inTotalPrice) : null,
      storageLocation: dto.storageLocation ?? null,
      remainingQuantity: String(dto.inQuantity),
      remark: dto.remark ?? null,
    };

    const inserted = await this.db
      .insert(inventory)
      .values(values as typeof inventory.$inferInsert)
      .returning();

    const item = this.toInventoryItem(inserted[0], true);

    await this.logService.record(
      operatorId,
      operatorName,
      'create_inventory',
      'inventory',
      item.id,
      `新增库存：${item.materialName}，数量 ${dto.inQuantity}`,
    );

    return item;
  }

  async update(
    id: string,
    dto: UpdateInventoryRequest,
    operatorId: string,
    operatorName: string,
  ): Promise<InventoryItem> {
    const existing = await this.db
      .select()
      .from(inventory)
      .where(eq(inventory.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('库存记录不存在');
    }

    const patch: Record<string, unknown> = {};

    if (dto.materialName !== undefined) patch.materialName = dto.materialName;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.specification !== undefined)
      patch.specification = dto.specification ?? null;
    if (dto.casNo !== undefined) patch.casNo = dto.casNo ?? null;
    if (dto.isHazardous !== undefined)
      patch.isHazardous = dto.isHazardous ?? null;
    if (dto.purity !== undefined) patch.purity = dto.purity ?? null;
    if (dto.purchaseChannel !== undefined)
      patch.purchaseChannel = dto.purchaseChannel ?? null;
    if (dto.purchaseLink !== undefined)
      patch.purchaseLink = dto.purchaseLink ?? null;
    if (dto.applicant !== undefined) patch.applicant = dto.applicant ?? null;
    if (dto.inQuantity !== undefined)
      patch.inQuantity = String(dto.inQuantity);
    if (dto.inUnitPrice !== undefined)
      patch.inUnitPrice =
        dto.inUnitPrice != null ? String(dto.inUnitPrice) : null;
    if (dto.inTotalPrice !== undefined)
      patch.inTotalPrice =
        dto.inTotalPrice != null ? String(dto.inTotalPrice) : null;
    if (dto.storageLocation !== undefined)
      patch.storageLocation = dto.storageLocation ?? null;
    if (dto.remainingQuantity !== undefined)
      patch.remainingQuantity = String(dto.remainingQuantity);
    if (dto.remark !== undefined) patch.remark = dto.remark ?? null;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    patch.updatedAt = new Date();

    const updated = await this.db
      .update(inventory)
      .set(patch as typeof inventory.$inferInsert)
      .where(eq(inventory.id, id))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException('库存记录不存在');
    }

    const item = this.toInventoryItem(updated[0], true);

    await this.logService.record(
      operatorId,
      operatorName,
      'update_inventory',
      'inventory',
      id,
      `修改库存：${item.materialName}`,
    );

    return item;
  }

  async consume(
    id: string,
    dto: ConsumeInventoryRequest,
    operatorId: string,
    operatorName: string,
  ): Promise<InventoryItem> {
    if (dto.quantity <= 0) {
      throw new BadRequestException('领用数量必须大于0');
    }

    const existing = await this.db
      .select()
      .from(inventory)
      .where(eq(inventory.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('库存记录不存在');
    }

    const currentRemaining = Number(existing[0].remainingQuantity);
    if (currentRemaining < dto.quantity) {
      throw new ConflictException('库存不足，无法完成领用');
    }

    const newRemaining = currentRemaining - dto.quantity;

    const updated = await this.db
      .update(inventory)
      .set({
        remainingQuantity: String(newRemaining),
        updatedAt: new Date(),
      } as unknown as Partial<typeof inventory.$inferInsert>)
      .where(eq(inventory.id, id))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException('库存记录不存在');
    }

    const item = this.toInventoryItem(updated[0], true);

    await this.logService.record(
      operatorId,
      operatorName,
      'consume_inventory',
      'inventory',
      id,
      `领用消耗：${item.materialName}，数量 ${dto.quantity}${dto.remark ? '，备注：' + dto.remark : ''}`,
    );

    return item;
  }

  async delete(
    id: string,
    operatorId: string,
    operatorName: string,
  ): Promise<void> {
    const existing = await this.db
      .select()
      .from(inventory)
      .where(eq(inventory.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('库存记录不存在');
    }

    const materialName = existing[0].materialName;

    const deleted = await this.db
      .delete(inventory)
      .where(eq(inventory.id, id))
      .returning({ id: inventory.id });

    if (deleted.length === 0) {
      throw new NotFoundException('库存记录不存在');
    }

    await this.logService.record(
      operatorId,
      operatorName,
      'delete_inventory',
      'inventory',
      id,
      `删除库存：${materialName}`,
    );
  }

  getImportTemplate(): { buffer: Buffer; fileName: string } {
    const headers = [
      '物料名称',
      '耗材分类',
      '规格型号',
      'CAS号',
      '是否危化品',
      '纯度',
      '采购渠道',
      '采购链接',
      '申请人',
      '入库时间',
      '入库数量',
      '入库单价',
      '入库总价',
      '存放位置',
      '当前剩余库存数量',
      '备注',
    ];

    const exampleRow = [
      '无水乙醇',
      '化学试剂',
      '500ml/瓶 分析纯',
      '64-17-5',
      '是',
      'AR ≥99.7%',
      '国药集团',
      'https://www.reagent.com.cn/...',
      '张三',
      '2024-01-15',
      10,
      35,
      350,
      'A栋301室试剂柜1层',
      8,
      '示例行，可删除',
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    worksheet['!cols'] = [
      { wch: 25 },
      { wch: 12 },
      { wch: 20 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 15 },
      { wch: 30 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 20 },
      { wch: 16 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '库存导入模板');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return { buffer, fileName: '库存导入模板.xlsx' };
  }

  async batchImport(
    rows: Record<string, unknown>[],
    operatorId: string,
    operatorName: string,
  ): Promise<InventoryImportResult> {
    const errors: InventoryImportRowError[] = [];
    const validItems: CreateInventoryRequest[] = [];
    const validRowNums: number[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const rowNum = i + 2;
      const row = rows[i];
      const rowErrors: InventoryImportRowError[] = [];

      const materialName = typeof row['物料名称'] === 'string'
        ? row['物料名称'].trim()
        : String(row['物料名称'] ?? '').trim();
      if (!materialName) {
        rowErrors.push({ row: rowNum, field: '物料名称', message: '物料名称不能为空' });
      }

      const categoryLabel = typeof row['耗材分类'] === 'string'
        ? row['耗材分类'].trim()
        : String(row['耗材分类'] ?? '').trim();
      let category: MaterialCategory | null = null;
      if (!categoryLabel) {
        rowErrors.push({ row: rowNum, field: '耗材分类', message: '耗材分类不能为空' });
      } else {
        const found = (Object.entries(MATERIAL_CATEGORY_LABELS) as [MaterialCategory, string][])
          .find(([, label]) => label === categoryLabel);
        if (found) {
          category = found[0];
        } else {
          rowErrors.push({
            row: rowNum,
            field: '耗材分类',
            message: `耗材分类必须是：化学试剂、化学耗材、仪器设备，当前值为"${categoryLabel}"`,
          });
        }
      }

      const inQuantityRaw = row['入库数量'];
      let inQuantity = 0;
      if (inQuantityRaw === undefined || inQuantityRaw === null || inQuantityRaw === '') {
        rowErrors.push({ row: rowNum, field: '入库数量', message: '入库数量不能为空' });
      } else {
        const qty = Number(inQuantityRaw);
        if (Number.isNaN(qty) || qty < 0) {
          rowErrors.push({ row: rowNum, field: '入库数量', message: '入库数量必须是非负数字' });
        } else {
          inQuantity = qty;
        }
      }

      const remainingRaw = row['当前剩余库存数量'] ?? row['剩余数量'];
      let remainingQuantity = inQuantity;
      if (remainingRaw !== undefined && remainingRaw !== null && remainingRaw !== '') {
        const rem = Number(remainingRaw);
        if (Number.isNaN(rem) || rem < 0) {
          rowErrors.push({
            row: rowNum,
            field: '当前剩余库存数量',
            message: '当前剩余库存数量必须是非负数字',
          });
        } else if (rem > inQuantity && inQuantity > 0) {
          rowErrors.push({
            row: rowNum,
            field: '当前剩余库存数量',
            message: '剩余数量不能大于入库数量',
          });
        } else {
          remainingQuantity = rem;
        }
      }

      const hazardousLabel = typeof row['是否危化品'] === 'string'
        ? row['是否危化品'].trim()
        : '';
      let isHazardous: HazardousOption | undefined;
      if (hazardousLabel) {
        const found = (Object.entries(HAZARDOUS_LABELS) as [HazardousOption, string][])
          .find(([, label]) => label === hazardousLabel);
        if (found) {
          isHazardous = found[0];
        } else {
          rowErrors.push({
            row: rowNum,
            field: '是否危化品',
            message: `是否危化品必须是：是、否，当前值为"${hazardousLabel}"`,
          });
        }
      }

      const inTimeStr = typeof row['入库时间'] === 'string'
        ? row['入库时间'].trim()
        : String(row['入库时间'] ?? '').trim();
      let inTime: Date | null = null;
      if (inTimeStr) {
        const parsed = new Date(inTimeStr);
        if (Number.isNaN(parsed.getTime())) {
          rowErrors.push({
            row: rowNum,
            field: '入库时间',
            message: `入库时间格式不正确："${inTimeStr}"，请使用 YYYY-MM-DD 格式`,
          });
        } else {
          inTime = parsed;
        }
      }

      const unitPriceRaw = row['入库单价'];
      let inUnitPrice: number | undefined;
      if (unitPriceRaw !== undefined && unitPriceRaw !== null && unitPriceRaw !== '') {
        const price = Number(unitPriceRaw);
        if (Number.isNaN(price) || price < 0) {
          rowErrors.push({ row: rowNum, field: '入库单价', message: '入库单价必须是非负数字' });
        } else {
          inUnitPrice = price;
        }
      }

      const totalPriceRaw = row['入库总价'];
      let inTotalPrice: number | undefined;
      if (totalPriceRaw !== undefined && totalPriceRaw !== null && totalPriceRaw !== '') {
        const price = Number(totalPriceRaw);
        if (Number.isNaN(price) || price < 0) {
          rowErrors.push({ row: rowNum, field: '入库总价', message: '入库总价必须是非负数字' });
        } else {
          inTotalPrice = price;
        }
      }

      const getStr = (key: string): string | undefined => {
        const val = row[key];
        if (val === undefined || val === null) return undefined;
        const s = String(val).trim();
        return s || undefined;
      };

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }

      const item: CreateInventoryRequest & { inTime?: Date; remainingQuantity?: number } = {
        materialName,
        category: category!,
        specification: getStr('规格型号'),
        casNo: getStr('CAS号'),
        isHazardous,
        purity: getStr('纯度'),
        purchaseChannel: getStr('采购渠道'),
        purchaseLink: getStr('采购链接'),
        applicant: getStr('申请人'),
        inQuantity,
        inUnitPrice,
        inTotalPrice,
        storageLocation: getStr('存放位置'),
        remark: getStr('备注'),
      };
      if (inTime) item.inTime = inTime;
      if (remainingQuantity !== undefined && remainingQuantity !== inQuantity) {
        item.remainingQuantity = remainingQuantity;
      }

      validItems.push(item);
      validRowNums.push(rowNum);
    }

    const importedIds: string[] = [];

    if (validItems.length > 0) {
      await Promise.all(validItems.map(async (item) => {
        if (item.isHazardous === undefined) {
          const autoHaz = await this.hazchemService.checkChemical(
            item.materialName,
            item.casNo ?? undefined,
          );
          item.isHazardous = autoHaz.isHazardous ? 'yes' : 'no';
        }
      }));

      const insertValues = validItems.map((item) => {
        const total = item.inTotalPrice !== undefined
          ? item.inTotalPrice
          : item.inUnitPrice != null
            ? item.inQuantity * item.inUnitPrice
            : undefined;
        return {
          materialName: item.materialName,
          category: item.category,
          specification: item.specification ?? null,
          casNo: item.casNo ?? null,
          isHazardous: item.isHazardous ?? null,
          purity: item.purity ?? null,
          purchaseChannel: item.purchaseChannel ?? null,
          purchaseLink: item.purchaseLink ?? null,
          applicant: item.applicant ?? null,
          inTime: (item as CreateInventoryRequest & { inTime?: Date }).inTime ?? new Date(),
          inQuantity: String(item.inQuantity),
          inUnitPrice: item.inUnitPrice != null ? String(item.inUnitPrice) : null,
          inTotalPrice: total != null ? String(total) : null,
          storageLocation: item.storageLocation ?? null,
          remainingQuantity: String(
            (item as CreateInventoryRequest & { remainingQuantity?: number }).remainingQuantity
              ?? item.inQuantity,
          ),
          remark: item.remark ?? null,
        };
      });

      const inserted = await this.db
        .insert(inventory)
        .values(insertValues as (typeof inventory.$inferInsert)[])
        .returning({ id: inventory.id, materialName: inventory.materialName });

      importedIds.push(...inserted.map((r) => r.id));

      const names = inserted.map((r) => r.materialName).join('、');
      await this.logService.record(
        operatorId,
        operatorName,
        'create_inventory',
        'inventory',
        '',
        `批量导入库存 ${inserted.length} 条：${names.length > 60 ? names.slice(0, 60) + '...' : names}`,
      );
    }

    return {
      successCount: importedIds.length,
      failCount: errors.length > 0 ? rows.length - validItems.length : 0,
      errors,
      importedIds,
    };
  }
}
