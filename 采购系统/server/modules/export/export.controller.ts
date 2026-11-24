import {
  Controller,
  Get,
  Query,
  Param,
  Req,
  Res,
} from '@nestjs/common';
import { IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { Roles } from '@server/common/jwt/auth.middleware';
import type { AuthenticatedRequest } from '@server/common/jwt/auth.middleware';
import { MATERIAL_CATEGORIES } from '@shared/api.interface';
import type { MaterialCategory } from '@shared/api.interface';

class InventoryExportQuery {
  @IsOptional()
  @IsString()
  @Type(() => String)
  @IsIn(MATERIAL_CATEGORIES)
  category?: MaterialCategory;

  @IsOptional()
  @IsString()
  keyword?: string;
}

@Controller('api/export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('order/:id')
  async exportOrder(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName } = await this.exportService.exportOrder(
      id,
      req.user.userId,
      req.user.role,
    );

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
  @Get('inventory')
  async exportInventory(
    @Query() query: InventoryExportQuery,
    @Req() _req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName } = await this.exportService.exportInventory(
      query.category,
      query.keyword,
    );

    const encodedInvName = encodeURIComponent(fileName);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${encodedInvName}; filename*=UTF-8''${encodedInvName}`,
    );
    res.send(buffer);
  }
}
