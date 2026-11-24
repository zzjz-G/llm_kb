import { Controller, Get, Query, Req } from '@nestjs/common';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LogsService } from './logs.service';
import { Roles } from '@server/common/jwt/auth.middleware';
import type { AuthenticatedRequest } from '@server/common/jwt/auth.middleware';
import type { LogListResponse, LogQuery, LogAction } from '@shared/api.interface';
import { LOG_ACTIONS } from '@shared/api.interface';

class LogQueryDto implements LogQuery {
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
  @Type(() => String)
  @IsIn(LOG_ACTIONS)
  action?: LogAction;

  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  @IsString()
  operatorName?: string;
}

@Controller('api/logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Roles(['admin'])
  @Get()
  async list(
    @Req() _req: AuthenticatedRequest,
    @Query() query: LogQueryDto,
  ): Promise<LogListResponse> {
    return this.logsService.list(query);
  }
}
