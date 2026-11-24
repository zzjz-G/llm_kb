import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  Req,
  Res,
} from '@nestjs/common';
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsNotEmpty,
  IsIn,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryService } from './inventory.service';
import { Roles } from '@server/common/jwt/auth.middleware';
import type { AuthenticatedRequest } from '@server/common/jwt/auth.middleware';
import type {
  InventoryItem,
  InventoryListResponse,
  CreateInventoryRequest,
  UpdateInventoryRequest,
  ConsumeInventoryRequest,
  InventoryQuery,
  MaterialCategory,
  HazardousOption,
} from '@shared/api.interface';
import {
  MATERIAL_CATEGORIES,
  HAZARDOUS_OPTIONS,
} from '@shared/api.interface';
import type {
  InventoryImportResult,
  InventoryImportRowError,
} from '@shared/api.interface';
import type { Response } from 'express';

class InventoryQueryDto implements InventoryQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  @IsIn(MATERIAL_CATEGORIES)
  category?: MaterialCategory;

  @IsOptional()
  @IsString()
  storageLocation?: string;

  @IsOptional()
  @IsString()
  applicant?: string;

  @IsOptional()
  @IsString()
  casNo?: string;
}

class CreateInventoryDto implements CreateInventoryRequest {
  @IsString()
  @IsNotEmpty({ message: '物料名称不能为空' })
  materialName!: string;

  @IsString()
  @Type(() => String)
  @IsIn(MATERIAL_CATEGORIES, { message: '物料分类无效' })
  category!: MaterialCategory;

  @IsOptional()
  @IsString()
  specification?: string;

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
  purchaseChannel?: string;

  @IsOptional()
  @IsString()
  purchaseLink?: string;

  @IsOptional()
  @IsString()
  applicant?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: '入库数量不能为负' })
  inQuantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  inUnitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  inTotalPrice?: number;

  @IsOptional()
  @IsString()
  storageLocation?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

class UpdateInventoryDto implements UpdateInventoryRequest {
  @IsOptional()
  @IsString()
  materialName?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  @IsIn(MATERIAL_CATEGORIES)
  category?: MaterialCategory;

  @IsOptional()
  @IsString()
  specification?: string;

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
  purchaseChannel?: string;

  @IsOptional()
  @IsString()
  purchaseLink?: string;

  @IsOptional()
  @IsString()
  applicant?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  inQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  inUnitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  inTotalPrice?: number;

  @IsOptional()
  @IsString()
  storageLocation?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  remainingQuantity?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

class ConsumeInventoryDto implements ConsumeInventoryRequest {
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: '领用数量必须大于0' })
  quantity!: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

@Controller('api/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query() query: InventoryQueryDto,
  ): Promise<InventoryListResponse> {
    const isAdmin = req.user.role === 'admin';
    return this.inventoryService.list(query, isAdmin);
  }

  @Roles(['admin'])
  @Get('template')
  async downloadTemplate(
    @Req() _req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName } = this.inventoryService.getImportTemplate();
    const encodedName = encodeURIComponent(fileName);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${encodedName}; filename*=UTF-8''${encodedName}`,
    );
    res.send(buffer);
  }

  @Roles(['admin'])
  @Post('batch-import')
  async batchImport(
    @Req() req: AuthenticatedRequest,
    @Body() body: { rows: Record<string, unknown>[] },
  ): Promise<InventoryImportResult> {
    if (!body.rows || !Array.isArray(body.rows)) {
      return {
        successCount: 0,
        failCount: 0,
        errors: [{ row: 0, field: '', message: '导入数据格式错误' }],
        importedIds: [],
      };
    }
    return this.inventoryService.batchImport(
      body.rows,
      req.user.userId,
      req.user.name,
    );
  }

  @Get(':id')
  async detail(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<InventoryItem> {
    const isAdmin = req.user.role === 'admin';
    return this.inventoryService.findById(id, isAdmin);
  }

  @Roles(['admin'])
  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateInventoryDto,
  ): Promise<InventoryItem> {
    return this.inventoryService.create(dto, req.user.userId, req.user.name);
  }

  @Roles(['admin'])
  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryDto,
  ): Promise<InventoryItem> {
    return this.inventoryService.update(
      id,
      dto,
      req.user.userId,
      req.user.name,
    );
  }

  @Roles(['admin'])
  @Post(':id/consume')
  async consume(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ConsumeInventoryDto,
  ): Promise<InventoryItem> {
    return this.inventoryService.consume(
      id,
      dto,
      req.user.userId,
      req.user.name,
    );
  }

  @Roles(['admin'])
  @Delete(':id')
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<{ success: true; message: string }> {
    await this.inventoryService.delete(id, req.user.userId, req.user.name);
    return { success: true, message: '删除成功' };
  }
}
