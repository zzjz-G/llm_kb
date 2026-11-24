import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Query,
  Param,
  Req,
} from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import type { AuthenticatedRequest } from '@server/common/jwt/auth.middleware';
import { Roles } from '@server/common/jwt/auth.middleware';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsIn,
  IsNumber,
  Min,
  ValidateNested,
  IsInt,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import type {
  CreatePurchaseOrderRequest,
  OrderListQuery,
  OrderListResponse,
  PurchaseOrder,
  ReviewOrderRequest,
  StoreOrderRequest,
  PendingStoreCheckResponse,
  StockCheckResult,
  CompleteOrderRequest,
  OrderStatus,
  MaterialCategory,
  HazardousOption,
  CountResponse,
  StudentBadgeCountResponse,
} from '@shared/api.interface';
import { ORDER_STATUSES, MATERIAL_CATEGORIES, HAZARDOUS_OPTIONS } from '@shared/api.interface';

class CreatePurchaseItemDto {
  @IsString()
  @Type(() => String)
  @IsIn(MATERIAL_CATEGORIES)
  category!: MaterialCategory;

  @IsString()
  @IsNotEmpty({ message: '物料名称不能为空' })
  materialName!: string;

  @IsOptional()
  @IsString()
  casNo?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  @IsIn(HAZARDOUS_OPTIONS)
  isHazardous?: HazardousOption;

  @IsOptional()
  @IsString()
  purity?: string;

  @IsOptional()
  @IsString()
  specification?: string;

  @IsOptional()
  @IsString()
  purchaseChannel?: string;

  @IsOptional()
  @IsString()
  purchaseLink?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  applyQuantity!: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  estUnitPrice?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

class CreatePurchaseOrderDto implements CreatePurchaseOrderRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items!: CreatePurchaseItemDto[];

  @IsOptional()
  @IsString()
  remark?: string;
}

class ReviewOrderDto implements ReviewOrderRequest {
  @IsOptional()
  @IsString()
  reviewRemark?: string;
}

class StoreItemDto {
  @IsString()
  @IsNotEmpty({ message: 'itemId 不能为空' })
  itemId!: string;

  @IsOptional()
  @IsString()
  storageLocation?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  remainingQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  inUnitPrice?: number;
}

class StoreOrderDto implements StoreOrderRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreItemDto)
  items!: StoreItemDto[];
}

class CompleteItemDto {
  @IsString()
  @IsNotEmpty({ message: 'itemId 不能为空' })
  itemId!: string;

  @IsString()
  @IsNotEmpty({ message: '存放位置不能为空' })
  storageLocation!: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  remainingQuantity!: number;
}

class CompleteOrderDto implements CompleteOrderRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompleteItemDto)
  items!: CompleteItemDto[];
}

class OrderListQueryDto implements OrderListQuery {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @Type(() => String)
  @IsIn(ORDER_STATUSES)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  applicantId?: string;
}

@Controller('api/purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  // ==================== 1. 提交前检查 ====================
  @Roles(['student'])
  @Get('check-pending-store')
  async checkPendingStore(
    @Req() req: AuthenticatedRequest,
  ): Promise<PendingStoreCheckResponse> {
    return this.purchaseService.checkPendingStore(req.user.userId);
  }

  @Roles(['student'])
  @Get('my-badge-count')
  async getMyBadgeCount(
    @Req() req: AuthenticatedRequest,
    @Query('since') since?: string,
  ): Promise<StudentBadgeCountResponse> {
    return this.purchaseService.getStudentBadgeCount(req.user.userId, since);
  }

  // ==================== 2. 库存预警检索 ====================
  @Get('check-stock')
  async checkStock(
    @Query('materialName') materialName: string,
  ): Promise<StockCheckResult> {
    return this.purchaseService.checkStock(materialName);
  }

  // ==================== 3. 创建订单 ====================
  @Roles(['student'])
  @Post('orders')
  async createOrder(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    return this.purchaseService.createOrder(req.user.userId, req.user.name, dto);
  }

  // ==================== 4. 我的订单列表 ====================
  @Roles(['student'])
  @Get('orders/my')
  async getMyOrders(
    @Req() req: AuthenticatedRequest,
    @Query() query: OrderListQueryDto,
  ): Promise<OrderListResponse> {
    return this.purchaseService.getMyOrders(req.user.userId, query);
  }

  // ==================== 5. 全部订单列表（管理员） ====================
  @Roles(['admin'])
  @Get('pending-count')
  async getPendingCount(): Promise<CountResponse> {
    const count = await this.purchaseService.getPendingOrderCount();
    return { count };
  }

  @Roles(['admin'])
  @Get('orders')
  async getAllOrders(
    @Req() req: AuthenticatedRequest,
    @Query() query: OrderListQueryDto,
  ): Promise<OrderListResponse> {
    return this.purchaseService.getAllOrders(query);
  }

  // ==================== 6. 订单详情 ====================
  @Get('orders/:id')
  async getOrderDetail(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<PurchaseOrder> {
    return this.purchaseService.getOrderDetail(
      id,
      req.user.userId,
      req.user.role,
    );
  }

  // ==================== 7. 审核订单 - 通过 ====================
  @Roles(['admin'])
  @Post('orders/:id/approve')
  async approveOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ReviewOrderDto,
  ): Promise<PurchaseOrder> {
    return this.purchaseService.approveOrder(
      id,
      req.user.userId,
      req.user.name,
      dto,
    );
  }

  // ==================== 7. 审核订单 - 驳回 ====================
  @Roles(['admin'])
  @Post('orders/:id/reject')
  async rejectOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ReviewOrderDto,
  ): Promise<PurchaseOrder> {
    return this.purchaseService.rejectOrder(
      id,
      req.user.userId,
      req.user.name,
      dto,
    );
  }

  // ==================== 8. 登记入库 ====================
  @Roles(['admin'])
  @Post('orders/:id/store')
  async storeOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: StoreOrderDto,
  ): Promise<PurchaseOrder> {
    return this.purchaseService.storeOrder(
      id,
      req.user.userId,
      req.user.name,
      dto,
    );
  }

  // ==================== 9. 学生补填 ====================
  @Roles(['student'])
  @Patch('orders/:id/complete')
  async completeOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CompleteOrderDto,
  ): Promise<PurchaseOrder> {
    return this.purchaseService.completeOrder(
      id,
      req.user.userId,
      req.user.name,
      dto,
    );
  }

  // ==================== 10. 删除订单 ====================
  @Roles(['student'])
  @Delete('orders/:id')
  async deleteOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<{ success: true; message: string }> {
    await this.purchaseService.deleteOrder(id, req.user.userId, req.user.name);
    return { success: true, message: '删除成功' };
  }
}
