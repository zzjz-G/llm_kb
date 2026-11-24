import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { labUsers } from '@server/database/schema';
import { JwtService } from '@server/common/jwt/jwt.service';
import type { UserInfo, LoginResponse } from '@shared/api.interface';
import type { UserRole, UserStatus } from '@shared/api.interface';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly jwtService: JwtService,
  ) {}

  private toUserInfo(row: typeof labUsers.$inferSelect): UserInfo {
    return {
      id: row.id,
      studentId: row.studentId,
      name: row.name,
      role: row.role as UserRole,
      status: row.status as UserStatus,
      email: row.email ?? undefined,
      registerSource: (row as { registerSource?: string }).registerSource === 'self_registered'
        ? 'self_registered'
        : 'admin_created',
      phone: row.phone ?? undefined,
      receiveName: row.receiveName ?? undefined,
      receivePhone: row.receivePhone ?? undefined,
      receiveAddress: row.receiveAddress ?? undefined,
      reviewRemark: row.reviewRemark ?? undefined,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async login(studentId: string, password: string): Promise<LoginResponse> {
    const users: typeof labUsers.$inferSelect[] = await this.db
      .select()
      .from(labUsers)
      .where(eq(labUsers.studentId, studentId))
      .limit(1);

    if (users.length === 0) {
      throw new UnauthorizedException('学号或密码错误');
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('学号或密码错误');
    }

    if (user.status === 'disabled') {
      throw new UnauthorizedException('账号已被禁用，请联系管理员');
    }

    if (user.status === 'pending') {
      throw new UnauthorizedException('账号正在等待管理员审批，请耐心等待');
    }

    const token = this.jwtService.sign({
      userId: user.id,
      studentId: user.studentId,
      role: user.role,
      name: user.name,
    });

    return {
      token,
      user: this.toUserInfo(user),
    };
  }

  async me(userId: string): Promise<UserInfo> {
    const users: typeof labUsers.$inferSelect[] = await this.db
      .select()
      .from(labUsers)
      .where(eq(labUsers.id, userId))
      .limit(1);

    if (users.length === 0) {
      throw new UnauthorizedException('用户不存在');
    }

    return this.toUserInfo(users[0]);
  }
}
