import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { HazardousChemicalsService } from './hazardous-chemicals.service';
import { HazchemCheckDto } from './dto/hazchem-check.dto';
import { HazchemListDto } from './dto/hazchem-list.dto';
import { Roles } from '@server/common/jwt/auth.middleware';
import type { AuthenticatedRequest } from '@server/common/jwt/auth.middleware';
import type {
  HazardousChemical,
  HazchemCheckResult,
  HazchemListResult,
} from '@shared/api.interface';

@Controller('api/hazardous-chemicals')
export class HazardousChemicalsController {
  constructor(
    private readonly hazchemService: HazardousChemicalsService,
  ) {}

  // ==================== 登录用户可用 ====================

  @Post('check')
  async checkChemical(
    @Body() dto: HazchemCheckDto,
    @Req() _req: AuthenticatedRequest,
  ): Promise<HazchemCheckResult> {
    return this.hazchemService.checkChemical(dto.name, dto.cas);
  }

  // ==================== 管理员接口 ====================

  @Roles(['admin'])
  @Get()
  async list(
    @Req() _req: AuthenticatedRequest,
    @Query() query: HazchemListDto,
  ): Promise<HazchemListResult> {
    return this.hazchemService.list({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
      keyword: query.keyword,
    });
  }

  @Roles(['admin'])
  @Get(':id')
  async getById(
    @Req() _req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<HazardousChemical> {
    return this.hazchemService.getById(id);
  }
}
