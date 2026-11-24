import { Controller, Post, Get, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from '@server/common/jwt/auth.middleware';
import type { LoginRequest, LoginResponse, UserInfo } from '@shared/api.interface';
import { IsString, IsNotEmpty } from 'class-validator';

class LoginDto implements LoginRequest {
  @IsString()
  @IsNotEmpty({ message: '学号不能为空' })
  studentId!: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password!: string;
}

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto.studentId, dto.password);
  }

  @Post('logout')
  async logout(): Promise<{ success: true; message: string }> {
    return { success: true, message: '登出成功' };
  }

  @Get('me')
  async me(@Req() req: AuthenticatedRequest): Promise<UserInfo> {
    return this.authService.me(req.user.userId);
  }
}
