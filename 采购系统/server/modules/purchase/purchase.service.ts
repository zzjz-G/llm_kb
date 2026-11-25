import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/common/database/drizzle.constants';
import type { PostgresJsDatabase } from '@server/common/database/database.module';
import { Inject } from '@nestjs/common';
import { eq, and, ilike, or, desc, count, inArray, gte, lt } from 'drizzle-orm';
import { purchaseOrders, purchaseItems, inventory, labUsers } from '@server/database/tables';
import { LogService } from '@server/common/log/log.service';
import { HazardousChemicalsService } from '@server/modules/hazardous-chemicals/hazardous-chemicals.service';
import { EmailService } from '@server/modules/email/email.service';
import type {
  CreatePurchaseOrderRequest,
  OrderListQuery,
  OrderListResponse,
  PurchaseOrder,
  PurchaseItem,
  ReviewOrderRequest,
  StoreOrderRequest,
  PendingStoreCheckResponse,
  StockCheckResult,
  CompleteOrderRequest,
  OrderStatus,
  MaterialCategory,
  HazardousOption,
  StudentBadgeCountResponse,
} from '@shared/api.interface';
import { isOrderStatus } from '@shared/api.interface';

function numericToNum(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return value;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

function numericToNumRequired(value: string | number): number {
  if (typeof value === 'number') return value;
  return Number(value);
}

type OrderRow = typeof purchaseOrders.$inferSelect;
type ItemRow = typeof purchaseItems.$inferSelect;

function mapPurchaseItem(row: ItemRow): PurchaseItem {
  return {
    id: row.id,
    orderId: row.orderId,
    itemIndex: row.itemIndex,
    category: row.category as MaterialCategory,
    materialName: row.materialName,
    casNo: row.casNo ?? undefined,
    isHazardous: (row.isHazardous as HazardousOption) ?? undefined,
    purity: row.purity ?? undefined,
    specification: row.specification ?? undefined,
    purchaseChannel: row.purchaseChannel ?? undefined,
    purchaseLink: row.purchaseLink ?? undefined,
    applyQuantity: numericToNumRequired(row.applyQuantity),
    estUnitPrice: numericToNum(row.estUnitPrice),
    estTotalPrice: numericToNum(row.estTotalPrice),
    remark: row.remark ?? undefined,
    storageLocation: row.storageLocation ?? undefined,
    remainingQuantity: numericToNum(row.remainingQuantity),
    createdAt: row.createdAt.toISOString(),
  };
}

function mapPurchaseOrder(
  row: OrderRow,
  items: PurchaseItem[],
): PurchaseOrder {
  return {
    id: row.id,
    orderNo: row.orderNo,
    applicantId: row.applicantId,
    applicantName: row.applicantName,
    status: row.status as OrderStatus,
    totalAmount: numericToNumRequired(row.totalAmount),
    remark: row.remark ?? undefined,
    reviewRemark: row.reviewRemark ?? undefined,
    reviewedBy: row.reviewedBy ?? undefined,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : undefined,
    storedAt: row.storedAt ? row.storedAt.toISOString() : undefined,
    completedAt: row.completedAt ? row.completedAt.toISOString() : undefined,
    createdAt: row.createdAt.toISOString(),
    items,
    receiveName: (row as { receiveName?: string }).receiveName ?? undefined,
    receivePhone: (row as { receivePhone?: string }).receivePhone ?? undefined,
    receiveAddress: (row as { receiveAddress?: string }).receiveAddress ?? undefined,
  };
}

@Injectable()
export class PurchaseService {
  private readonly logger = new Logger('PurchaseEmail');

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly logService: LogService,
    private readonly hazchemService: HazardousChemicalsService,
    private readonly emailService: EmailService,
  ) {}

  // ==================== 0. 危化品自动识别 ====================

  async detectHazardous(
    materialName: string,
    cas?: string,
  ): Promise<'yes' | 'no'> {
    return this.hazchemService.detectHazardous(materialName, cas);
  }

  // ==================== 1. 提交前检查 ====================
  async checkPendingStore(userId: string): Promise<PendingStoreCheckResponse> {
    const storedOrders: OrderRow[] = await this.db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.applicantId, userId),
          eq(purchaseOrders.status, 'stored'),
        ),
      );

    if (storedOrders.length === 0) {
      return { hasPending: false, pendingOrders: [] };
    }

    const orderIds = storedOrders.map((o: OrderRow) => o.id);
    const allItems: ItemRow[] = await this.db
      .select()
      .from(purchaseItems)
      .where(inArray(purchaseItems.orderId, orderIds));

    const itemsByOrder = new Map<string, ItemRow[]>();
    for (const item of allItems) {
      const arr = itemsByOrder.get(item.orderId) ?? [];
      arr.push(item);
      itemsByOrder.set(item.orderId, arr);
    }

    const pendingOrders: PendingStoreCheckResponse['pendingOrders'] = [];
    for (const order of storedOrders) {
      const items = itemsByOrder.get(order.id) ?? [];
      pendingOrders.push({
        id: order.id,
        orderNo: order.orderNo,
        itemCount: items.length,
      });
    }

    return {
      hasPending: pendingOrders.length > 0,
      pendingOrders,
    };
  }

  async getStudentBadgeCount(
    userId: string,
    since?: string,
  ): Promise<StudentBadgeCountResponse> {
    const pendingStoreResult = await this.db
      .select({ total: count() })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.applicantId, userId),
          eq(purchaseOrders.status, 'stored'),
        ),
      );
    const pendingStoreCount = Number(pendingStoreResult[0]?.total ?? 0);

    let newApprovalCount = 0;
    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        const approvalResult = await this.db
          .select({ total: count() })
          .from(purchaseOrders)
          .where(
            and(
              eq(purchaseOrders.applicantId, userId),
              inArray(purchaseOrders.status, ['approved', 'rejected']),
              gte(purchaseOrders.reviewedAt, sinceDate),
            ),
          );
        newApprovalCount = Number(approvalResult[0]?.total ?? 0);
      }
    }

    return { pendingStoreCount, newApprovalCount };
  }

  async getPendingOrderCount(): Promise<number> {
    const result = await this.db
      .select({ total: count() })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.status, 'pending'));
    return Number(result[0]?.total ?? 0);
  }

  // ==================== 2. 库存预警检索 ====================
  async checkStock(materialName: string): Promise<StockCheckResult> {
    if (!materialName || materialName.trim() === '') {
      return { materialName: '', hasStock: false, stockItems: [] };
    }
    const trimmed = materialName.trim();
    const rows = await this.db
      .select({
        id: inventory.id,
        materialName: inventory.materialName,
        specification: inventory.specification,
        remainingQuantity: inventory.remainingQuantity,
        storageLocation: inventory.storageLocation,
      })
      .from(inventory)
      .where(ilike(inventory.materialName, `%${trimmed}%`))
      .limit(20);

    const stockItems = rows.map((r) => ({
      id: r.id,
      materialName: r.materialName,
      specification: r.specification ?? undefined,
      remainingQuantity: numericToNumRequired(r.remainingQuantity),
      storageLocation: r.storageLocation ?? undefined,
    }));

    return {
      materialName: trimmed,
      hasStock: stockItems.length > 0,
      stockItems,
    };
  }

  // ==================== 3. 创建订单 ====================
  async createOrder(
    userId: string,
    userName: string,
    dto: CreatePurchaseOrderRequest,
  ): Promise<PurchaseOrder> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('请至少添加一条物料');
    }

    // 待补填检查
    const pending = await this.checkPendingStore(userId);
    if (pending.hasPending) {
      throw new BadRequestException(
        '您有已入库但未补填存放位置的单据，请先补填后再提交新申请',
      );
    }

    const orderNo = await this.generateOrderNo();
    const totalAmount = dto.items.reduce((sum: number, item) => {
      const qty = item.applyQuantity ?? 0;
      const price = item.estUnitPrice ?? 0;
      return sum + qty * price;
    }, 0);

    const userRows = await this.db
      .select()
      .from(labUsers)
      .where(eq(labUsers.id, userId))
      .limit(1);
    const user = userRows[0];

    return this.db.transaction(async (tx) => {
      const [orderRow] = await tx
        .insert(purchaseOrders)
        .values({
          orderNo,
          applicantId: userId,
          applicantName: userName,
          status: 'pending',
          totalAmount: totalAmount.toString(),
          remark: dto.remark,
          receiveName: user?.receiveName ?? undefined,
          receivePhone: user?.receivePhone ?? undefined,
          receiveAddress: user?.receiveAddress ?? undefined,
        })
        .returning();

      const itemValues = await Promise.all(dto.items.map(async (item, idx) => {
        const estTotal = (item.applyQuantity ?? 0) * (item.estUnitPrice ?? 0);
        const autoHaz = await this.hazchemService.checkChemical(
          item.materialName,
          item.casNo,
        );
        return {
          orderId: orderRow.id,
          itemIndex: idx + 1,
          category: item.category,
          materialName: item.materialName,
          casNo: item.casNo,
          isHazardous: autoHaz.isHazardous ? 'yes' : 'no',
          purity: item.purity,
          specification: item.specification,
          purchaseChannel: item.purchaseChannel,
          purchaseLink: item.purchaseLink,
          applyQuantity: item.applyQuantity.toString(),
          estUnitPrice:
            item.estUnitPrice !== undefined ? item.estUnitPrice.toString() : undefined,
          estTotalPrice: estTotal.toString(),
          remark: item.remark,
        };
      }));

      const itemRows = await tx.insert(purchaseItems).values(itemValues).returning();

      void this.logService.record(
        userId,
        userName,
        'create_order',
        'purchase_order',
        orderRow.id,
        `提交采购单 ${orderNo}，共 ${dto.items.length} 条物料，总金额 ${totalAmount.toFixed(2)}`,
      );

      const order = mapPurchaseOrder(orderRow, itemRows.map(mapPurchaseItem));
      void this.notifyAdminsNewOrder(orderRow, itemRows);

      return order;
    });
  }

  // ==================== 4. 我的订单列表 ====================
  async getMyOrders(
    userId: string,
    query: OrderListQuery,
  ): Promise<OrderListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const conditions = [eq(purchaseOrders.applicantId, userId)];
    if (query.status && isOrderStatus(query.status)) {
      conditions.push(eq(purchaseOrders.status, query.status));
    }

    const keyword = query.keyword?.trim();
    let matchingOrderIds: string[] | null = null;
    if (keyword && keyword.length > 0) {
      const itemMatches = await this.db
        .select({ orderId: purchaseItems.orderId })
        .from(purchaseItems)
        .where(ilike(purchaseItems.materialName, `%${keyword}%`));
      const itemOrderIds = itemMatches.map((m) => m.orderId);

      const orderMatches = await this.db
        .select({ id: purchaseOrders.id })
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.applicantId, userId),
            ilike(purchaseOrders.orderNo, `%${keyword}%`),
          ),
        );
      const orderMatchIds = orderMatches.map((m) => m.id);

      matchingOrderIds = [...new Set([...itemOrderIds, ...orderMatchIds])];
      if (matchingOrderIds.length === 0) {
        return { items: [], total: 0, page, pageSize };
      }
      conditions.push(inArray(purchaseOrders.id, matchingOrderIds));
    }

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(purchaseOrders)
      .where(and(...conditions));

    const orderRows: OrderRow[] = await this.db
      .select()
      .from(purchaseOrders)
      .where(and(...conditions))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items: ItemRow[] =
      orderRows.length > 0
        ? await this.db
            .select()
            .from(purchaseItems)
            .where(inArray(purchaseItems.orderId, orderRows.map((o) => o.id)))
            .orderBy(purchaseItems.itemIndex)
        : [];

    const itemsByOrder = new Map<string, PurchaseItem[]>();
    for (const it of items) {
      const mapped = mapPurchaseItem(it);
      const arr = itemsByOrder.get(it.orderId) ?? [];
      arr.push(mapped);
      itemsByOrder.set(it.orderId, arr);
    }

    const result: PurchaseOrder[] = orderRows.map((row) =>
      mapPurchaseOrder(row, itemsByOrder.get(row.id) ?? []),
    );

    return {
      items: result,
      total: Number(total),
      page,
      pageSize,
    };
  }

  // ==================== 5. 全部订单列表（管理员） ====================
  async getAllOrders(query: OrderListQuery): Promise<OrderListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const conditions = [];
    if (query.status && isOrderStatus(query.status)) {
      conditions.push(eq(purchaseOrders.status, query.status));
    }
    if (query.applicantId) {
      conditions.push(eq(purchaseOrders.applicantId, query.applicantId));
    }

    const keyword = query.keyword?.trim();
    let matchingOrderIds: string[] | null = null;
    if (keyword && keyword.length > 0) {
      const itemMatches = await this.db
        .select({ orderId: purchaseItems.orderId })
        .from(purchaseItems)
        .where(ilike(purchaseItems.materialName, `%${keyword}%`));
      const itemOrderIds = itemMatches.map((m) => m.orderId);

      const orderMatches = await this.db
        .select({ id: purchaseOrders.id })
        .from(purchaseOrders)
        .where(
          or(
            ilike(purchaseOrders.orderNo, `%${keyword}%`),
            ilike(purchaseOrders.applicantName, `%${keyword}%`),
          ),
        );
      const orderMatchIds = orderMatches.map((m) => m.id);

      matchingOrderIds = [...new Set([...itemOrderIds, ...orderMatchIds])];
      if (matchingOrderIds.length === 0) {
        return { items: [], total: 0, page, pageSize };
      }
      conditions.push(inArray(purchaseOrders.id, matchingOrderIds));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(purchaseOrders)
      .where(whereClause ?? eq(purchaseOrders.id, purchaseOrders.id));

    const baseQuery = whereClause
      ? this.db.select().from(purchaseOrders).where(whereClause)
      : this.db.select().from(purchaseOrders);

    const orderRows: OrderRow[] = await baseQuery
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items: ItemRow[] =
      orderRows.length > 0
        ? await this.db
            .select()
            .from(purchaseItems)
            .where(inArray(purchaseItems.orderId, orderRows.map((o) => o.id)))
            .orderBy(purchaseItems.itemIndex)
        : [];

    const itemsByOrder = new Map<string, PurchaseItem[]>();
    for (const it of items) {
      const mapped = mapPurchaseItem(it);
      const arr = itemsByOrder.get(it.orderId) ?? [];
      arr.push(mapped);
      itemsByOrder.set(it.orderId, arr);
    }

    const result: PurchaseOrder[] = orderRows.map((row) =>
      mapPurchaseOrder(row, itemsByOrder.get(row.id) ?? []),
    );

    return {
      items: result,
      total: Number(total),
      page,
      pageSize,
    };
  }

  // ==================== 6. 订单详情 ====================
  async getOrderDetail(
    id: string,
    userId?: string,
    role?: string,
  ): Promise<PurchaseOrder> {
    const orderRows: OrderRow[] = await this.db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (orderRows.length === 0) {
      throw new NotFoundException('订单不存在');
    }
    const orderRow = orderRows[0];

    if (role !== 'admin' && userId && orderRow.applicantId !== userId) {
      throw new ForbiddenException('无权限查看该订单');
    }

    const itemRows: ItemRow[] = await this.db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.orderId, id))
      .orderBy(purchaseItems.itemIndex);

    return mapPurchaseOrder(
      orderRow,
      itemRows.map(mapPurchaseItem),
    );
  }

  // ==================== 7. 审核订单 ====================
  async approveOrder(
    id: string,
    reviewerId: string,
    reviewerName: string,
    dto: ReviewOrderRequest,
  ): Promise<PurchaseOrder> {
    return this.updateOrderStatus(
      id,
      'approved',
      reviewerId,
      reviewerName,
      dto.reviewRemark,
      'approve_order',
    );
  }

  async rejectOrder(
    id: string,
    reviewerId: string,
    reviewerName: string,
    dto: ReviewOrderRequest,
  ): Promise<PurchaseOrder> {
    return this.updateOrderStatus(
      id,
      'rejected',
      reviewerId,
      reviewerName,
      dto.reviewRemark,
      'reject_order',
    );
  }

  private async updateOrderStatus(
    id: string,
    newStatus: OrderStatus,
    reviewerId: string,
    reviewerName: string,
    reviewRemark: string | undefined,
    logAction: 'approve_order' | 'reject_order',
  ): Promise<PurchaseOrder> {
    const orderRows: OrderRow[] = await this.db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (orderRows.length === 0) {
      throw new NotFoundException('订单不存在');
    }
    const orderRow = orderRows[0];

    if (orderRow.status !== 'pending') {
      throw new BadRequestException('只有待审核的订单可以进行审核操作');
    }

    const [updated] = await this.db
      .update(purchaseOrders)
      .set({
        status: newStatus,
        reviewRemark: reviewRemark ?? null,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, id))
      .returning();

    const itemRows: ItemRow[] = await this.db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.orderId, id))
      .orderBy(purchaseItems.itemIndex);

    const actionText = logAction === 'approve_order' ? '审核通过' : '审核驳回';
    void this.logService.record(
      reviewerId,
      reviewerName,
      logAction,
      'purchase_order',
      id,
      `${actionText}订单 ${orderRow.orderNo}${
        reviewRemark ? `，审核意见：${reviewRemark}` : ''
      }`,
    );

    if (newStatus === 'approved') {
      void this.notifyStudentApproved(updated, itemRows);
    } else if (newStatus === 'rejected') {
      void this.notifyStudentRejected(updated, itemRows, reviewRemark);
    }

    return mapPurchaseOrder(updated, itemRows.map(mapPurchaseItem));
  }

  // ==================== 8. 登记入库 ====================
  async storeOrder(
    id: string,
    operatorId: string,
    operatorName: string,
    dto: StoreOrderRequest,
  ): Promise<PurchaseOrder> {
    const orderRows: OrderRow[] = await this.db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (orderRows.length === 0) {
      throw new NotFoundException('订单不存在');
    }
    const orderRow = orderRows[0];

    if (orderRow.status !== 'approved') {
      throw new BadRequestException('只有已通过的订单可以登记入库');
    }

    const itemRows: ItemRow[] = await this.db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.orderId, id));

    const itemMap = new Map<string, ItemRow>();
    for (const it of itemRows) {
      itemMap.set(it.id, it);
    }

    for (const storeItem of dto.items) {
      if (!itemMap.has(storeItem.itemId)) {
        throw new BadRequestException(`明细项 ${storeItem.itemId} 不存在`);
      }
    }

    return this.db.transaction(async (tx) => {
      const [updatedOrder] = await tx
        .update(purchaseOrders)
        .set({
          status: 'stored',
          storedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, id))
        .returning();

      const inventoryInserts: (typeof inventory.$inferInsert)[] = [];
      for (const storeItem of dto.items) {
        const item = itemMap.get(storeItem.itemId)!;
        const applyQty = numericToNumRequired(item.applyQuantity);
        const inUnitPrice = storeItem.inUnitPrice ?? 0;
        const inTotalPrice = applyQty * inUnitPrice;
        const remainingQty = storeItem.remainingQuantity !== undefined && storeItem.remainingQuantity !== null
          ? storeItem.remainingQuantity
          : applyQty;
        const storageLoc = storeItem.storageLocation?.trim() || null;

        // 更新 purchase_items
        await tx
          .update(purchaseItems)
          .set({
            storageLocation: storageLoc,
            remainingQuantity: remainingQty.toString(),
          })
          .where(eq(purchaseItems.id, storeItem.itemId));

        inventoryInserts.push({
          materialName: item.materialName,
          category: item.category,
          specification: item.specification,
          casNo: item.casNo,
          isHazardous: item.isHazardous,
          purity: item.purity,
          purchaseChannel: item.purchaseChannel,
          purchaseLink: item.purchaseLink,
          applicant: orderRow.applicantName,
          inQuantity: item.applyQuantity,
          inUnitPrice: inUnitPrice.toString(),
          inTotalPrice: inTotalPrice.toString(),
          storageLocation: storageLoc,
          remainingQuantity: remainingQty.toString(),
          sourceOrderId: id,
          sourceItemId: storeItem.itemId,
        });
      }

      if (inventoryInserts.length > 0) {
        await tx.insert(inventory).values(inventoryInserts);
      }

      void this.logService.record(
        operatorId,
        operatorName,
        'store_order',
        'purchase_order',
        id,
        `登记入库 ${orderRow.orderNo}，共 ${dto.items.length} 条物料`,
      );

      const updatedItems: ItemRow[] = await tx
        .select()
        .from(purchaseItems)
        .where(eq(purchaseItems.orderId, id))
        .orderBy(purchaseItems.itemIndex);

      void this.notifyStudentStored(updatedOrder, updatedItems);

      return mapPurchaseOrder(updatedOrder, updatedItems.map(mapPurchaseItem));
    });
  }

  // ==================== 9. 学生补填存放位置 ====================
  async completeOrder(
    id: string,
    userId: string,
    userName: string,
    dto: CompleteOrderRequest,
  ): Promise<PurchaseOrder> {
    const orderRows: OrderRow[] = await this.db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (orderRows.length === 0) {
      throw new NotFoundException('订单不存在');
    }
    const orderRow = orderRows[0];

    if (orderRow.applicantId !== userId) {
      throw new ForbiddenException('只能补填自己的订单');
    }
    if (orderRow.status !== 'stored') {
      throw new BadRequestException('只有已入库状态的订单可以补填存放位置');
    }

    const itemRows: ItemRow[] = await this.db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.orderId, id));

    const itemMap = new Map<string, ItemRow>();
    for (const it of itemRows) {
      itemMap.set(it.id, it);
    }

    for (const completeItem of dto.items) {
      if (!itemMap.has(completeItem.itemId)) {
        throw new BadRequestException(`明细项 ${completeItem.itemId} 不存在`);
      }
      if (!completeItem.storageLocation || completeItem.storageLocation.trim() === '') {
        throw new BadRequestException(`第 ${itemMap.get(completeItem.itemId)!.itemIndex} 条物料的存放位置不能为空`);
      }
      if (completeItem.remainingQuantity === undefined || completeItem.remainingQuantity === null || Number.isNaN(completeItem.remainingQuantity)) {
        throw new BadRequestException(`第 ${itemMap.get(completeItem.itemId)!.itemIndex} 条物料的剩余库存数量不能为空`);
      }
      if (completeItem.remainingQuantity < 0) {
        throw new BadRequestException(`第 ${itemMap.get(completeItem.itemId)!.itemIndex} 条物料的剩余库存数量不能为负数`);
      }
      const applyQty = numericToNumRequired(itemMap.get(completeItem.itemId)!.applyQuantity);
      if (completeItem.remainingQuantity > applyQty) {
        throw new BadRequestException(`第 ${itemMap.get(completeItem.itemId)!.itemIndex} 条物料的剩余库存数量不能大于入库数量`);
      }
    }

    return this.db.transaction(async (tx) => {
      for (const completeItem of dto.items) {
        await tx
          .update(purchaseItems)
          .set({
            storageLocation: completeItem.storageLocation.trim(),
            remainingQuantity: completeItem.remainingQuantity.toString(),
          })
          .where(eq(purchaseItems.id, completeItem.itemId));

        await tx
          .update(inventory)
          .set({
            storageLocation: completeItem.storageLocation.trim(),
            remainingQuantity: completeItem.remainingQuantity.toString(),
          })
          .where(eq(inventory.sourceItemId, completeItem.itemId));
      }

      // 检查是否全部补填完成
      const allItems: ItemRow[] = await tx
        .select()
        .from(purchaseItems)
        .where(eq(purchaseItems.orderId, id));

      const allCompleted = allItems.every(
        (it: ItemRow) =>
          it.storageLocation &&
          it.storageLocation.trim() !== '',
      );

      let updatedOrder: OrderRow = orderRow;
      if (allCompleted) {
        const [res] = await tx
          .update(purchaseOrders)
          .set({
            status: 'completed',
            completedAt: new Date(),
          })
          .where(eq(purchaseOrders.id, id))
          .returning();
        updatedOrder = res;
      } else {
        const rows: OrderRow[] = await tx
          .select()
          .from(purchaseOrders)
          .where(eq(purchaseOrders.id, id))
          .limit(1);
        if (rows.length > 0) {
          updatedOrder = rows[0];
        }
      }

      void this.logService.record(
        userId,
        userName,
        'complete_order',
        'purchase_order',
        id,
        `补填存放位置 ${orderRow.orderNo}，共 ${dto.items.length} 条物料${
          allCompleted ? '，订单已完成' : ''
        }`,
      );

      const finalItems: ItemRow[] = await tx
        .select()
        .from(purchaseItems)
        .where(eq(purchaseItems.orderId, id))
        .orderBy(purchaseItems.itemIndex);

      if (allCompleted) {
        void this.notifyStudentCompleted(updatedOrder, finalItems);
      }

      return mapPurchaseOrder(updatedOrder, finalItems.map(mapPurchaseItem));
    });
  }

  // ==================== 10. 删除订单 ====================
  async deleteOrder(id: string, userId: string, userName: string): Promise<void> {
    const orderRows: OrderRow[] = await this.db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (orderRows.length === 0) {
      throw new NotFoundException('订单不存在');
    }
    const orderRow = orderRows[0];

    if (orderRow.applicantId !== userId) {
      throw new ForbiddenException('只能删除自己的订单');
    }
    if (orderRow.status !== 'pending') {
      throw new BadRequestException('只有待审核状态的订单可以删除');
    }

    await this.db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));

    void this.logService.record(
      userId,
      userName,
      'delete_order',
      'purchase_order',
      id,
      `删除采购单 ${orderRow.orderNo}`,
    );
  }

  // ==================== 订单号生成 ====================
  private async generateOrderNo(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    const prefix = `PO${dateStr}`;

    const dayStart = new Date(year, now.getMonth(), now.getDate());
    const dayEnd = new Date(year, now.getMonth(), now.getDate() + 1);

    const todayOrders = await this.db
      .select({ orderNo: purchaseOrders.orderNo })
      .from(purchaseOrders)
      .where(
        and(
          gte(purchaseOrders.createdAt, dayStart),
          lt(purchaseOrders.createdAt, dayEnd),
        ),
      )
      .orderBy(desc(purchaseOrders.orderNo))
      .limit(1);

    let nextSeq = 1;
    if (todayOrders.length > 0) {
      const lastNo = todayOrders[0].orderNo;
      const seqStr = lastNo.slice(prefix.length);
      const seq = parseInt(seqStr, 10);
      if (!Number.isNaN(seq)) {
        nextSeq = seq + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  // ==================== 邮件通知工具方法 ====================

  private async getUserEmail(userId: string): Promise<string | null> {
    const rows = await this.db
      .select({ email: labUsers.email })
      .from(labUsers)
      .where(eq(labUsers.id, userId))
      .limit(1);
    return rows[0]?.email ?? null;
  }

  private async getAdminEmails(): Promise<string[]> {
    const rows = await this.db
      .select({ email: labUsers.email })
      .from(labUsers)
      .where(
        and(
          eq(labUsers.role, 'admin'),
          eq(labUsers.status, 'active'),
        ),
      );
    return rows
      .map((r) => r.email)
      .filter((e): e is string => !!e && e.trim() !== '');
  }

  private buildMaterialSummaryHtml(
    items: ItemRow[],
    includePrice: boolean,
  ): string {
    const displayItems = items.slice(0, 3);
    const extraCount = items.length - displayItems.length;

    const rows = displayItems
      .map((item: ItemRow, idx: number) => {
        const qty = numericToNumRequired(item.applyQuantity);
        const spec = item.specification ? `（${item.specification}）` : '';
        if (includePrice) {
          const unitPrice = numericToNum(item.estUnitPrice) ?? 0;
          const total = numericToNum(item.estTotalPrice) ?? 0;
          return `
            <tr>
              <td style="padding:8px 12px;border:1px solid #e5e7eb;">${idx + 1}. ${item.materialName}${spec}</td>
              <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">${qty}</td>
              <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">¥${unitPrice.toFixed(2)}</td>
              <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">¥${total.toFixed(2)}</td>
            </tr>`;
        }
        return `
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;">${idx + 1}. ${item.materialName}${spec}</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">${qty}</td>
          </tr>`;
      })
      .join('');

    let headerRow: string;
    if (includePrice) {
      headerRow = `
        <tr style="background:#f8fafc;">
          <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;font-weight:600;">物料名称</th>
          <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;font-weight:600;">数量</th>
          <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;font-weight:600;">单价</th>
          <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;font-weight:600;">小计</th>
        </tr>`;
    } else {
      headerRow = `
        <tr style="background:#f8fafc;">
          <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;font-weight:600;">物料名称</th>
          <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;font-weight:600;">数量</th>
        </tr>`;
    }

    let extraHtml = '';
    if (extraCount > 0) {
      const colSpan = includePrice ? 4 : 2;
      extraHtml = `
        <tr>
          <td colspan="${colSpan}" style="padding:8px 12px;border:1px solid #e5e7eb;color:#6b7280;font-size:13px;">
            等 ${items.length} 种物料
          </td>
        </tr>`;
    }

    return `
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1e293b;">
        <thead>${headerRow}</thead>
        <tbody>${rows}${extraHtml}</tbody>
      </table>`;
  }

  private async sendIfHasEmail(
    toEmail: string | null,
    subject: string,
    html: string,
  ): Promise<void> {
    if (!toEmail || toEmail.trim() === '') {
      this.logger.debug(`跳过邮件发送：收件人邮箱为空，主题「${subject}」`);
      return;
    }
    try {
      await this.emailService.sendEmail(toEmail, subject, html);
    } catch (err) {
      this.logger.error(`邮件发送失败：${subject} -> ${toEmail}`, err instanceof Error ? err.stack : String(err));
    }
  }

  private wrapEmailHtml(title: string, bodyHtml: string): string {
    return `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans SC',sans-serif;background:#f8fafc;padding:24px;color:#1e293b;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:4px;padding:32px;">
          <h2 style="margin:0 0 20px 0;font-size:18px;font-weight:600;color:#0f172a;border-bottom:2px solid #1e6a8f;padding-bottom:12px;">${title}</h2>
          ${bodyHtml}
          <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#94a3b8;">
            此邮件由系统自动发送，请勿直接回复。
          </div>
        </div>
      </div>`;
  }

  // ==================== 邮件通知方法 ====================

  private async notifyAdminsNewOrder(order: OrderRow, items: ItemRow[]): Promise<void> {
    try {
      const adminEmails = await this.getAdminEmails();
      if (adminEmails.length === 0) {
        this.logger.debug('跳过管理员通知：无有效管理员邮箱');
        return;
      }

      const subject = `新采购申请待审批 - ${order.orderNo} ${order.applicantName}`;
      const totalAmount = numericToNumRequired(order.totalAmount);
      const materialTable = this.buildMaterialSummaryHtml(items, true);
      const submitTime = order.createdAt instanceof Date
        ? order.createdAt.toLocaleString('zh-CN', { hour12: false })
        : String(order.createdAt);

      // 查申请人学号
      const applicantRows = await this.db
        .select({ studentId: labUsers.studentId })
        .from(labUsers)
        .where(eq(labUsers.id, order.applicantId))
        .limit(1);
      const studentId = applicantRows[0]?.studentId ?? '-';

      const body = `
        <p style="margin:0 0 16px 0;font-size:14px;">尊敬的管理员：</p>
        <p style="margin:0 0 16px 0;font-size:14px;">有新的采购申请待您审批，详情如下：</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1e293b;margin-bottom:20px;">
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;width:120px;font-weight:500;">申请单号</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;font-family:JetBrains Mono,monospace;">${order.orderNo}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:500;">申请人</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;">${order.applicantName}（${studentId}）</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:500;">总金额</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#b45309;font-weight:600;">¥${totalAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:500;">提交时间</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;">${submitTime}</td>
          </tr>
        </table>
        <p style="margin:0 0 8px 0;font-size:14px;font-weight:500;">物料清单：</p>
        ${materialTable}
        <p style="margin:20px 0 0 0;font-size:14px;color:#475569;">请登录系统查看详情并进行审批操作。</p>`;

      const html = this.wrapEmailHtml('新采购申请待审批', body);

      for (const email of adminEmails) {
        void this.sendIfHasEmail(email, subject, html);
      }
    } catch (err) {
      this.logger.error('管理员新订单通知失败', err instanceof Error ? err.stack : String(err));
    }
  }

  private async notifyStudentApproved(order: OrderRow, items: ItemRow[]): Promise<void> {
    try {
      const studentEmail = await this.getUserEmail(order.applicantId);
      if (!studentEmail) {
        this.logger.debug(`跳过审批通过通知：学生 ${order.applicantId} 无邮箱`);
        return;
      }

      const subject = `采购申请已通过 - ${order.orderNo}`;
      const materialTable = this.buildMaterialSummaryHtml(items, false);
      const reviewTime = order.reviewedAt
        ? (order.reviewedAt instanceof Date
            ? order.reviewedAt.toLocaleString('zh-CN', { hour12: false })
            : String(order.reviewedAt))
        : '-';

      const body = `
        <p style="margin:0 0 16px 0;font-size:14px;">${order.applicantName} 同学：</p>
        <p style="margin:0 0 16px 0;font-size:14px;">您的采购申请已通过审核，详情如下：</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1e293b;margin-bottom:20px;">
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;width:120px;font-weight:500;">申请单号</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;font-family:JetBrains Mono,monospace;">${order.orderNo}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:500;">状态</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#059669;font-weight:600;">已通过</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:500;">审核时间</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;">${reviewTime}</td>
          </tr>
        </table>
        <p style="margin:0 0 8px 0;font-size:14px;font-weight:500;">物料清单：</p>
        ${materialTable}
        <p style="margin:20px 0 0 0;font-size:14px;color:#475569;">请等待物料到货入库通知。</p>`;

      const html = this.wrapEmailHtml('采购申请已通过', body);
      void this.sendIfHasEmail(studentEmail, subject, html);
    } catch (err) {
      this.logger.error('学生审批通过通知失败', err instanceof Error ? err.stack : String(err));
    }
  }

  private async notifyStudentRejected(
    order: OrderRow,
    items: ItemRow[],
    reviewRemark: string | undefined,
  ): Promise<void> {
    try {
      const studentEmail = await this.getUserEmail(order.applicantId);
      if (!studentEmail) {
        this.logger.debug(`跳过驳回通知：学生 ${order.applicantId} 无邮箱`);
        return;
      }

      const subject = `采购申请被驳回 - ${order.orderNo}`;
      const materialTable = this.buildMaterialSummaryHtml(items, false);
      const reviewTime = order.reviewedAt
        ? (order.reviewedAt instanceof Date
            ? order.reviewedAt.toLocaleString('zh-CN', { hour12: false })
            : String(order.reviewedAt))
        : '-';
      const reason = reviewRemark?.trim() || '未填写驳回原因';

      const body = `
        <p style="margin:0 0 16px 0;font-size:14px;">${order.applicantName} 同学：</p>
        <p style="margin:0 0 16px 0;font-size:14px;">您的采购申请未通过审核，详情如下：</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1e293b;margin-bottom:20px;">
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;width:120px;font-weight:500;">申请单号</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;font-family:JetBrains Mono,monospace;">${order.orderNo}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:500;">状态</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#dc2626;font-weight:600;">已驳回</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:500;">驳回原因</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#dc2626;">${reason}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:500;">审核时间</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;">${reviewTime}</td>
          </tr>
        </table>
        <p style="margin:0 0 8px 0;font-size:14px;font-weight:500;">物料清单：</p>
        ${materialTable}
        <p style="margin:20px 0 0 0;font-size:14px;color:#475569;">如有疑问，请联系管理员。</p>`;

      const html = this.wrapEmailHtml('采购申请被驳回', body);
      void this.sendIfHasEmail(studentEmail, subject, html);
    } catch (err) {
      this.logger.error('学生驳回通知失败', err instanceof Error ? err.stack : String(err));
    }
  }

  private async notifyStudentStored(order: OrderRow, items: ItemRow[]): Promise<void> {
    try {
      const studentEmail = await this.getUserEmail(order.applicantId);
      if (!studentEmail) {
        this.logger.debug(`跳过入库通知：学生 ${order.applicantId} 无邮箱`);
        return;
      }

      const subject = `物料已入库，请补填存放位置 - ${order.orderNo}`;
      const materialTable = this.buildMaterialSummaryHtml(items, false);
      const storeTime = order.storedAt
        ? (order.storedAt instanceof Date
            ? order.storedAt.toLocaleString('zh-CN', { hour12: false })
            : String(order.storedAt))
        : '-';

      const body = `
        <p style="margin:0 0 16px 0;font-size:14px;">${order.applicantName} 同学：</p>
        <p style="margin:0 0 16px 0;font-size:14px;">您申请采购的物料已登记入库，请尽快登录系统补填存放位置和剩余数量。</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1e293b;margin-bottom:20px;">
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;width:120px;font-weight:500;">申请单号</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;font-family:JetBrains Mono,monospace;">${order.orderNo}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:500;">状态</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#0891b2;font-weight:600;">已入库（待补填）</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:500;">入库时间</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;">${storeTime}</td>
          </tr>
        </table>
        <p style="margin:0 0 8px 0;font-size:14px;font-weight:500;">物料清单：</p>
        ${materialTable}
        <p style="margin:20px 0 0 0;font-size:14px;color:#475569;">请登录系统，在「我的订单」中找到对应单据，补填每件物料的存放位置和剩余数量。</p>`;

      const html = this.wrapEmailHtml('物料已入库，请补填', body);
      void this.sendIfHasEmail(studentEmail, subject, html);
    } catch (err) {
      this.logger.error('学生入库通知失败', err instanceof Error ? err.stack : String(err));
    }
  }

  private async notifyStudentCompleted(order: OrderRow, items: ItemRow[]): Promise<void> {
    try {
      const studentEmail = await this.getUserEmail(order.applicantId);
      if (!studentEmail) {
        this.logger.debug(`跳过完成通知：学生 ${order.applicantId} 无邮箱`);
        return;
      }

      const subject = `采购订单已完成 - ${order.orderNo}`;
      const materialTable = this.buildMaterialSummaryHtml(items, false);
      const completeTime = order.completedAt
        ? (order.completedAt instanceof Date
            ? order.completedAt.toLocaleString('zh-CN', { hour12: false })
            : String(order.completedAt))
        : '-';

      const body = `
        <p style="margin:0 0 16px 0;font-size:14px;">${order.applicantName} 同学：</p>
        <p style="margin:0 0 16px 0;font-size:14px;">您的采购订单已全部补填完成，订单已关闭。</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1e293b;margin-bottom:20px;">
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;width:120px;font-weight:500;">申请单号</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;font-family:JetBrains Mono,monospace;">${order.orderNo}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:500;">状态</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#475569;font-weight:600;">已完成</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:500;">完成时间</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;">${completeTime}</td>
          </tr>
        </table>
        <p style="margin:0 0 8px 0;font-size:14px;font-weight:500;">物料清单：</p>
        ${materialTable}
        <p style="margin:20px 0 0 0;font-size:14px;color:#475569;">感谢您的配合。如有其他采购需求，请提交新的申请。</p>`;

      const html = this.wrapEmailHtml('采购订单已完成', body);
      void this.sendIfHasEmail(studentEmail, subject, html);
    } catch (err) {
      this.logger.error('学生完成通知失败', err instanceof Error ? err.stack : String(err));
    }
  }
}
