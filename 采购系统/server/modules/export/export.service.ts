import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, ilike, desc, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { purchaseOrders, purchaseItems, labUsers, inventory } from '@server/database/schema';
import {
  MATERIAL_CATEGORY_LABELS,
  HAZARDOUS_LABELS,
} from '@shared/api.interface';
import type { MaterialCategory, HazardousOption } from '@shared/api.interface';

interface OrderExportData {
  buffer: Buffer;
  fileName: string;
}

interface InventoryExportData {
  buffer: Buffer;
  fileName: string;
}

@Injectable()
export class ExportService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async exportOrder(
    orderId: string,
    userId: string,
    role: string,
  ): Promise<OrderExportData> {
    const orderRows = await this.db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, orderId))
      .limit(1);

    if (orderRows.length === 0) {
      throw new NotFoundException('采购订单不存在');
    }

    const order = orderRows[0];

    // 学生只能导出自己的订单
    if (role === 'student' && order.applicantId !== userId) {
      throw new ForbiddenException('无权限导出该订单');
    }

    const items = await this.db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.orderId, orderId))
      .orderBy(purchaseItems.itemIndex);

    // 使用订单快照中的收货信息（学生后续修改不影响历史订单）
    const receiveName = order.receiveName || order.applicantName;
    const receivePhone = order.receivePhone || '';
    const receiveAddress = order.receiveAddress || '';

    // 构建 Excel 数据
    const headers = [
      '序号',
      '耗材分类',
      '物料名称',
      'CAS号',
      '是否危化品',
      '纯度',
      '规格型号',
      '采购渠道',
      '采购链接',
      '申请数量',
      '备注',
    ];

    const dataRows: (string | number)[][] = items.map(
      (item, index: number) => [
        index + 1,
        MATERIAL_CATEGORY_LABELS[item.category as MaterialCategory] ||
          item.category,
        item.materialName,
        item.casNo || '',
        item.isHazardous
          ? HAZARDOUS_LABELS[item.isHazardous as HazardousOption]
          : '',
        item.purity || '',
        item.specification || '',
        item.purchaseChannel || '',
        item.purchaseLink || '',
        Number(item.applyQuantity),
        item.remark || '',
      ],
    );

    // 添加收货信息区块
    const footerRows: (string | number)[][] = [
      [],
      ['收货信息'],
      ['申请人姓名', receiveName],
      ['手机号', receivePhone],
      ['收件地址', receiveAddress],
    ];

    const allData = [headers, ...dataRows, ...footerRows];

    const worksheet = XLSX.utils.aoa_to_sheet(allData);

    // 设置列宽
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 12 },
      { wch: 25 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 20 },
      { wch: 15 },
      { wch: 30 },
      { wch: 10 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '订货清单');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const fileName = `订货单_${order.applicantName}_${this.formatDate(new Date())}.xlsx`;

    return { buffer, fileName };
  }

  async exportInventory(
    category?: string,
    keyword?: string,
  ): Promise<InventoryExportData> {
    const conditions: SQL[] = [];

    if (category) {
      conditions.push(eq(inventory.category, category));
    }
    if (keyword) {
      const kw = `%${keyword}%`;
      conditions.push(
        sql`(${inventory.materialName} ilike ${kw}
          OR ${inventory.casNo} ilike ${kw}
          OR ${inventory.applicant} ilike ${kw})`,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select()
      .from(inventory)
      .where(whereClause)
      .orderBy(desc(inventory.createdAt));

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

    const dataRows: (string | number)[][] = rows.map((row) => [
      row.materialName,
      MATERIAL_CATEGORY_LABELS[row.category as MaterialCategory] ||
        row.category,
      row.specification || '',
      row.casNo || '',
      row.isHazardous
        ? HAZARDOUS_LABELS[row.isHazardous as HazardousOption]
        : '',
      row.purity || '',
      row.purchaseChannel || '',
      row.purchaseLink || '',
      row.applicant || '',
      this.formatDate(row.inTime),
      Number(row.inQuantity),
      row.inUnitPrice != null ? Number(row.inUnitPrice) : '',
      row.inTotalPrice != null ? Number(row.inTotalPrice) : '',
      row.storageLocation || '',
      Number(row.remainingQuantity),
      row.remark || '',
    ]);

    const allData = [headers, ...dataRows];

    const worksheet = XLSX.utils.aoa_to_sheet(allData);

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
    XLSX.utils.book_append_sheet(workbook, worksheet, '库存台账');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const fileName = `库存台账_${this.formatDate(new Date())}.xlsx`;

    return { buffer, fileName };
  }
}
