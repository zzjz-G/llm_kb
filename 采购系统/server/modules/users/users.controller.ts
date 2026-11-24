import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
  IsEmail,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { UsersService } from './users.service';
import type { AuthenticatedRequest } from '@server/common/jwt/auth.middleware';
import { Roles } from '@server/common/jwt/auth.middleware';
import {
  USER_ROLES,
  USER_STATUS,
} from '@shared/api.interface';
import type {
  UserInfo,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateProfileRequest,
  UserListResponse,
  UserRole,
  UserStatus as UserStatusType,
  RegisterRequest,
  CountResponse,
} from '@shared/api.interface';

class UserListQueryDto {
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
  @Transform(({ obj, key }) => (obj[key] === '' ? undefined : obj[key]))
  @IsString()
  keyword?: string;

  @IsOptional()
  @Transform(({ obj, key }) => (obj[key] === '' ? undefined : obj[key]))
  @IsString()
  @Type(() => String)
  @IsIn(USER_ROLES)
  role?: UserRole;

  @IsOptional()
  @Transform(({ obj, key }) => (obj[key] === '' ? undefined : obj[key]))
  @IsString()
  @Type(() => String)
  @IsIn(USER_STATUS)
  status?: UserStatusType;
}

class CreateUserDto implements CreateUserRequest {
  @IsString()
  @IsNotEmpty({ message: '学号不能为空' })
  studentId!: string;

  @IsString()
  @IsNotEmpty({ message: '姓名不能为空' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password!: string;

  @IsString()
  @Type(() => String)
  @IsIn(USER_ROLES, { message: '角色不合法' })
  role!: UserRole;
}

class RegisterDto implements RegisterRequest {
  @IsString()
  @IsNotEmpty({ message: '学号不能为空' })
  studentId!: string;

  @IsString()
  @IsNotEmpty({ message: '姓名不能为空' })
  name!: string;

  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: '请确认密码' })
  confirmPassword!: string;

  @IsString()
  @IsNotEmpty({ message: '请填写联系人' })
  receiveName!: string;

  @IsString()
  @IsNotEmpty({ message: '请填写联系电话' })
  receivePhone!: string;

  @IsString()
  @IsNotEmpty({ message: '请填写收件地址' })
  receiveAddress!: string;
}

class RejectUserDto {
  @IsString()
  @IsOptional()
  reviewRemark?: string;
}

class UpdateUserDto implements UpdateUserRequest {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  @IsIn(USER_ROLES, { message: '角色不合法' })
  role?: UserRole;

  @IsOptional()
  @IsString()
  @Type(() => String)
  @IsIn(USER_STATUS, { message: '状态不合法' })
  status?: UserStatusType;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: '新密码不能为空' })
  password!: string;
}

class UpdateProfileDto implements UpdateProfileRequest {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  receiveName?: string;

  @IsOptional()
  @IsString()
  receivePhone?: string;

  @IsOptional()
  @IsString()
  receiveAddress?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: '原密码不能为空' })
  oldPassword!: string;

  @IsString()
  @IsNotEmpty({ message: '新密码不能为空' })
  newPassword!: string;
}

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==================== 公开接口 ====================

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<UserInfo> {
    return this.usersService.selfRegister(dto);
  }

  // ==================== 学生个人接口 ====================
  // 静态路由必须在动态路由 :id 之前定义，避免被抢先匹配

  @Get('profile')
  async getProfile(@Req() req: AuthenticatedRequest): Promise<UserInfo> {
    return this.usersService.getProfile(req.user.userId);
  }

  @Patch('profile')
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserInfo> {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @Post('change-password')
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    return this.usersService.changePassword(
      req.user.userId,
      dto.oldPassword,
      dto.newPassword,
    );
  }

  // ==================== 管理员接口 ====================

  @Roles(['admin'])
  @Get('pending-count')
  async getPendingCount(): Promise<CountResponse> {
    const count = await this.usersService.getPendingCount();
    return { count };
  }

  @Roles(['admin'])
  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query() query: UserListQueryDto,
  ): Promise<UserListResponse> {
    return this.usersService.list({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
      keyword: query.keyword,
      role: query.role,
      status: query.status,
    });
  }

  @Roles(['admin'])
  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateUserDto,
  ): Promise<UserInfo> {
    return this.usersService.create(dto, req.user.userId, req.user.name);
  }

  @Roles(['admin'])
  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserInfo> {
    return this.usersService.update(id, dto, req.user.userId, req.user.name);
  }

  @Roles(['admin'])
  @Post(':id/reset-password')
  async resetPassword(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<{ success: boolean }> {
    return this.usersService.resetPassword(
      id,
      dto.password,
      req.user.userId,
      req.user.name,
    );
  }

  @Roles(['admin'])
  @Post(':id/disable')
  async toggleDisable(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<UserInfo> {
    return this.usersService.toggleDisable(
      id,
      req.user.userId,
      req.user.name,
    );
  }

  @Roles(['admin'])
  @Post(':id/approve')
  async approve(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<UserInfo> {
    return this.usersService.approveUser(
      id,
      req.user.userId,
      req.user.name,
    );
  }

  @Roles(['admin'])
  @Post(':id/reject')
  async reject(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: RejectUserDto,
  ): Promise<UserInfo> {
    return this.usersService.rejectUser(
      id,
      dto.reviewRemark ?? '',
      req.user.userId,
      req.user.name,
    );
  }

  @Roles(['admin'])
  @Delete(':id')
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    return this.usersService.deleteUser(
      id,
      req.user.userId,
      req.user.name,
    );
  }
}
