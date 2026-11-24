import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import * as bcrypt from 'bcryptjs';
import { eq, and, ilike, or, count, desc } from 'drizzle-orm';
import { labUsers } from '@server/database/schema';
import { LogService } from '@server/common/log/log.service';
import { EmailService } from '@server/modules/email/email.service';
import { Logger } from '@nestjs/common';
import type {
  UserInfo,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateProfileRequest,
  UserListResponse,
  UserRole,
  UserStatus,
  RegisterRequest,
  ReviewOrderRequest,
} from '@shared/api.interface';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly logService: LogService,
    private readonly emailService: EmailService,
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

  async getPendingCount(): Promise<number> {
    const result = await this.db
      .select({ total: count() })
      .from(labUsers)
      .where(
        and(
          eq(labUsers.role, 'student'),
          eq(labUsers.status, 'pending'),
        ),
      );
    return Number(result[0]?.total ?? 0);
  }

  async list(params: {
    page: number;
    pageSize: number;
    keyword?: string;
    role?: UserRole;
    status?: UserStatus;
  }): Promise<UserListResponse> {
    const { page, pageSize, keyword, role, status } = params;
    const conditions = [];

    if (keyword) {
      conditions.push(
        or(
          ilike(labUsers.studentId, `%${keyword}%`),
          ilike(labUsers.name, `%${keyword}%`),
          ilike(labUsers.email, `%${keyword}%`),
        ),
      );
    }
    if (role) conditions.push(eq(labUsers.role, role));
    if (status) conditions.push(eq(labUsers.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult = await this.db
      .select({ count: count() })
      .from(labUsers)
      .where(whereClause);

    const total = Number(countResult[0]?.count ?? 0);

    const rows: typeof labUsers.$inferSelect[] = await this.db
      .select()
      .from(labUsers)
      .where(whereClause)
      .orderBy(desc(labUsers.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items: rows.map((row: typeof labUsers.$inferSelect) => this.toUserInfo(row)),
      total,
      page,
      pageSize,
    };
  }

  async create(
    dto: CreateUserRequest,
    operatorId: string,
    operatorName: string,
  ): Promise<UserInfo> {
    // 检查学号是否已存在
    const existing = await this.db
      .select()
      .from(labUsers)
      .where(eq(labUsers.studentId, dto.studentId))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('该学号已存在');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const inserted = await this.db
      .insert(labUsers)
      .values({
        studentId: dto.studentId,
        name: dto.name,
        passwordHash,
        role: dto.role,
        registerSource: 'admin_created',
        receiveName: dto.name,
        email: (dto as { email?: string }).email ?? undefined,
      })
      .returning();

    const user = inserted[0];

    await this.logService.record(
      operatorId,
      operatorName,
      'create_user',
      'user',
      user.id,
      `创建用户：${dto.studentId} - ${dto.name}（${dto.role}）`,
    );

    return this.toUserInfo(user);
  }

  async selfRegister(dto: RegisterRequest): Promise<UserInfo> {
    if (!dto.password || dto.password.length < 6) {
      throw new BadRequestException('密码长度不能少于6位');
    }
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('两次输入的密码不一致');
    }
    if (!dto.receiveName?.trim()) {
      throw new BadRequestException('请填写联系人');
    }
    if (!dto.receivePhone?.trim()) {
      throw new BadRequestException('请填写联系电话');
    }
    if (!/^1[3-9]\d{9}$/.test(dto.receivePhone.trim())) {
      throw new BadRequestException('手机号格式不正确');
    }
    if (!dto.receiveAddress?.trim()) {
      throw new BadRequestException('请填写收件地址');
    }
    if (dto.email && dto.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email.trim())) {
        throw new BadRequestException('邮箱格式不正确');
      }
    }

    const existing = await this.db
      .select()
      .from(labUsers)
      .where(eq(labUsers.studentId, dto.studentId))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('该学号已注册');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const inserted = await this.db
      .insert(labUsers)
      .values({
        studentId: dto.studentId,
        name: dto.name,
        passwordHash,
        role: 'student',
        status: 'pending',
        registerSource: 'self_registered',
        receiveName: dto.receiveName.trim(),
        receivePhone: dto.receivePhone.trim(),
        receiveAddress: dto.receiveAddress.trim(),
        email: dto.email && dto.email.trim() !== '' ? dto.email.trim() : null,
      })
      .returning();

    const user = inserted[0];

    await this.logService.record(
      undefined,
      dto.name,
      'self_register',
      'user',
      user.id,
      `学生自助注册：${dto.studentId} - ${dto.name}（待审核）`,
    );

    void this.notifyAdminsNewRegistration(user.studentId, user.name, user.email);

    return this.toUserInfo(user);
  }

  async update(
    id: string,
    dto: UpdateUserRequest,
    operatorId: string,
    operatorName: string,
  ): Promise<UserInfo> {
    const patch: Partial<typeof labUsers.$inferInsert> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.role !== undefined) patch.role = dto.role;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.email !== undefined) {
      const emailVal = dto.email.trim();
      if (emailVal !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailVal)) {
          throw new BadRequestException('邮箱格式不正确');
        }
        patch.email = emailVal;
      } else {
        patch.email = null;
      }
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const updated = await this.db
      .update(labUsers)
      .set(patch)
      .where(eq(labUsers.id, id))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const changes: string[] = [];
    if (dto.name !== undefined) changes.push(`姓名→${dto.name}`);
    if (dto.role !== undefined) changes.push(`角色→${dto.role}`);
    if (dto.status !== undefined) changes.push(`状态→${dto.status}`);
    if (dto.phone !== undefined) changes.push(`手机号→${dto.phone}`);
    if (dto.email !== undefined) {
      changes.push(`邮箱→${dto.email.trim() || '空'}`);
    }

    await this.logService.record(
      operatorId,
      operatorName,
      'update_user',
      'user',
      id,
      changes.join('，'),
    );

    return this.toUserInfo(updated[0]);
  }

  async resetPassword(
    id: string,
    newPassword: string,
    operatorId: string,
    operatorName: string,
  ): Promise<{ success: boolean }> {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updated = await this.db
      .update(labUsers)
      .set({ passwordHash })
      .where(eq(labUsers.id, id))
      .returning({ id: labUsers.id });

    if (updated.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    await this.logService.record(
      operatorId,
      operatorName,
      'reset_password',
      'user',
      id,
      '重置密码',
    );

    return { success: true };
  }

  async toggleDisable(
    id: string,
    operatorId: string,
    operatorName: string,
  ): Promise<UserInfo> {
    const existing = await this.db
      .select()
      .from(labUsers)
      .where(eq(labUsers.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const newStatus: UserStatus =
      existing[0].status === 'active' ? 'disabled' : 'active';

    const updated = await this.db
      .update(labUsers)
      .set({ status: newStatus })
      .where(eq(labUsers.id, id))
      .returning();

    await this.logService.record(
      operatorId,
      operatorName,
      'disable_user',
      'user',
      id,
      newStatus === 'disabled' ? '禁用用户' : '启用用户',
    );

    return this.toUserInfo(updated[0]);
  }

  async approveUser(
    id: string,
    operatorId: string,
    operatorName: string,
  ): Promise<UserInfo> {
    const existing = await this.db
      .select()
      .from(labUsers)
      .where(eq(labUsers.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    if (existing[0].status !== 'pending') {
      throw new BadRequestException('该账号不在待审核状态');
    }

    const updated = await this.db
      .update(labUsers)
      .set({
        status: 'active',
        reviewRemark: null,
        reviewedBy: operatorId,
        reviewedAt: new Date(),
      })
      .where(eq(labUsers.id, id))
      .returning();

    await this.logService.record(
      operatorId,
      operatorName,
      'approve_user',
      'user',
      id,
      `审批通过：${existing[0].studentId} - ${existing[0].name}`,
    );

    return this.toUserInfo(updated[0]);
  }

  async rejectUser(
    id: string,
    reviewRemark: string,
    operatorId: string,
    operatorName: string,
  ): Promise<UserInfo> {
    const existing = await this.db
      .select()
      .from(labUsers)
      .where(eq(labUsers.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    if (existing[0].status !== 'pending') {
      throw new BadRequestException('该账号不在待审核状态');
    }

    const updated = await this.db
      .update(labUsers)
      .set({
        status: 'disabled',
        reviewRemark,
        reviewedBy: operatorId,
        reviewedAt: new Date(),
      })
      .where(eq(labUsers.id, id))
      .returning();

    await this.logService.record(
      operatorId,
      operatorName,
      'reject_user',
      'user',
      id,
      `审批拒绝：${existing[0].studentId} - ${existing[0].name}，原因：${reviewRemark || '未填写'}`,
    );

    return this.toUserInfo(updated[0]);
  }

  async getProfile(userId: string): Promise<UserInfo> {
    const users = await this.db
      .select()
      .from(labUsers)
      .where(eq(labUsers.id, userId))
      .limit(1);

    if (users.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    return this.toUserInfo(users[0]);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileRequest,
  ): Promise<UserInfo> {
    const patch: Partial<typeof labUsers.$inferInsert> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.receiveName !== undefined) patch.receiveName = dto.receiveName;
    if (dto.receivePhone !== undefined) patch.receivePhone = dto.receivePhone;
    if (dto.receiveAddress !== undefined) patch.receiveAddress = dto.receiveAddress;
    if (dto.email !== undefined) {
      const emailVal = dto.email.trim();
      if (emailVal !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailVal)) {
          throw new BadRequestException('邮箱格式不正确');
        }
        patch.email = emailVal;
      } else {
        patch.email = null;
      }
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const updated = await this.db
      .update(labUsers)
      .set(patch)
      .where(eq(labUsers.id, userId))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const changes: string[] = [];
    if (dto.name !== undefined) changes.push(`姓名→${dto.name}`);
    if (dto.phone !== undefined) changes.push(`手机号→${dto.phone || '空'}`);
    if (dto.receiveName !== undefined) changes.push(`收货姓名→${dto.receiveName || '空'}`);
    if (dto.receivePhone !== undefined) changes.push(`收货电话→${dto.receivePhone || '空'}`);
    if (dto.receiveAddress !== undefined) changes.push(`收货地址→${dto.receiveAddress || '空'}`);
    if (dto.email !== undefined) changes.push(`邮箱→${dto.email.trim() || '空'}`);

    if (changes.length > 0) {
      await this.logService.record(
        userId,
        updated[0].name,
        'update_profile',
        'user',
        userId,
        changes.join('，'),
      );
    }

    return this.toUserInfo(updated[0]);
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    const users = await this.db
      .select()
      .from(labUsers)
      .where(eq(labUsers.id, userId))
      .limit(1);

    if (users.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const user = users[0];
    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) {
      throw new ForbiddenException('原密码错误');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.db
      .update(labUsers)
      .set({ passwordHash })
      .where(eq(labUsers.id, userId));

    return { success: true };
  }

  async deleteUser(
    id: string,
    operatorId: string,
    operatorName: string,
  ): Promise<{ success: true }> {
    const existing = await this.db
      .select()
      .from(labUsers)
      .where(eq(labUsers.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    if (existing[0].status === 'active') {
      throw new BadRequestException('活跃账号不能直接删除，请先禁用');
    }

    const target = existing[0];

    await this.db
      .delete(labUsers)
      .where(eq(labUsers.id, id));

    await this.logService.record(
      operatorId,
      operatorName,
      'delete_user',
      'user',
      id,
      `删除用户：${target.studentId} - ${target.name}`,
    );

    return { success: true };
  }

  private async notifyAdminsNewRegistration(
    studentId: string,
    name: string,
    userEmail: string | null,
  ): Promise<void> {
    try {
      const adminRows = await this.db
        .select({ email: labUsers.email })
        .from(labUsers)
        .where(
          and(
            eq(labUsers.role, 'admin'),
            eq(labUsers.status, 'active'),
          ),
        );
      const adminEmails = adminRows
        .map((r) => r.email)
        .filter((e): e is string => !!e && e.trim() !== '');

      if (adminEmails.length === 0) {
        this.logger.debug('跳过注册通知：无有效管理员邮箱');
        return;
      }

      const subject = `新账号申请待审批 - ${studentId} ${name}`;
      const body = `
        <p style="margin:0 0 16px 0;font-size:14px;">尊敬的管理员：</p>
        <p style="margin:0 0 16px 0;font-size:14px;">有新的学生注册申请待您审批，详情如下：</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1e293b;margin-bottom:20px;">
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;width:120px;font-weight:500;">学号</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;font-family:JetBrains Mono,monospace;">${studentId}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:500;">姓名</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;">${name}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:500;">邮箱</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;">${userEmail || '未填写'}</td>
          </tr>
        </table>
        <p style="margin:0;font-size:14px;color:#475569;">请登录系统进入「账号管理」查看详情并进行审批操作。</p>`;

      const html = this.wrapEmailHtml('新账号申请待审批', body);

      for (const email of adminEmails) {
        void this.emailService.sendEmail(email, subject, html).catch((err) => {
          this.logger.error(`注册通知邮件发送失败：${email}`, err instanceof Error ? err.stack : String(err));
        });
      }
    } catch (err) {
      this.logger.error('注册管理员通知失败', err instanceof Error ? err.stack : String(err));
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
}
