import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableProps } from '@lark-apaas/client-toolkit/antd-table';
import { Search, Plus, Pencil, Key, Power, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@client/src/components/ui/dialog';
import { Label } from '@client/src/components/ui/label';
import { Textarea } from '@client/src/components/ui/textarea';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import { usersApi } from '@client/src/api';
import {
  USER_ROLE_LABELS,
  USER_ROLES,
  USER_STATUS_LABELS,
  USER_STATUS,
  REGISTER_SOURCE_LABELS,
} from '@shared/api.interface';
import type { UserInfo, UserRole, UserStatus as UStatus } from '@shared/api.interface';

interface UserFormData {
  studentId: string;
  name: string;
  password: string;
  role: UserRole;
  email: string;
  phone: string;
  status: UStatus;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);

  const [formData, setFormData] = useState<UserFormData>({
    studentId: '',
    name: '',
    password: '',
    role: 'student',
    email: '',
    phone: '',
    status: 'active',
  });
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
  const [toggleUser, setToggleUser] = useState<UserInfo | null>(null);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectUser, setRejectUser] = useState<UserInfo | null>(null);
  const [rejectRemark, setRejectRemark] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [approveLoadingId, setApproveLoadingId] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserInfo | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params: {
      page: number;
      pageSize: number;
      keyword?: string;
      role?: string;
      status?: string;
    } = { page, pageSize };
    if (keyword.trim()) params.keyword = keyword.trim();
    if (roleFilter) params.role = roleFilter;
    if (statusFilter) params.status = statusFilter;

    usersApi
      .list(params)
      .then((res) => {
        setUsers(res.items);
        setTotal(res.total);
      })
      .catch((err: Error) => {
        toast.error(err.message || '加载用户列表失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, pageSize, keyword, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (): void => {
    setPage(1);
  };

  const openCreate = (): void => {
    setCurrentUser(null);
    setFormData({
      studentId: '',
      name: '',
      password: '',
      role: 'student',
      email: '',
      phone: '',
      status: 'active',
    });
    setCreateDialogOpen(true);
  };

  const openEdit = (user: UserInfo): void => {
    setCurrentUser(user);
    setFormData({
      studentId: user.studentId,
      name: user.name,
      password: '',
      role: user.role,
      email: user.email || '',
      phone: user.phone || '',
      status: user.status,
    });
    setEditDialogOpen(true);
  };

  const openReset = (user: UserInfo): void => {
    setCurrentUser(user);
    setNewPassword('');
    setResetDialogOpen(true);
  };

  const openToggle = (user: UserInfo): void => {
    setToggleUser(user);
    setToggleDialogOpen(true);
  };

  const handleApprove = async (id: string): Promise<void> => {
    setApproveLoadingId(id);
    try {
      await usersApi.approve(id);
      toast.success('审批通过');
      fetchUsers();
    } catch (err) {
      toast.error((err as Error).message || '审批失败');
    } finally {
      setApproveLoadingId(null);
    }
  };

  const openReject = (user: UserInfo): void => {
    setRejectUser(user);
    setRejectRemark('');
    setRejectDialogOpen(true);
  };

  const handleReject = async (): Promise<void> => {
    if (!rejectUser) return;
    setRejectSubmitting(true);
    try {
      await usersApi.reject(rejectUser.id, rejectRemark.trim() || undefined);
      toast.success('已拒绝');
      setRejectDialogOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error((err as Error).message || '操作失败');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleCreate = async (): Promise<void> => {
    if (!formData.studentId.trim()) {
      toast.error('请输入学号');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('请输入姓名');
      return;
    }
    if (!formData.password) {
      toast.error('请输入初始密码');
      return;
    }
    setSubmitting(true);
    try {
      if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        toast.error('邮箱格式不正确');
        setSubmitting(false);
        return;
      }
      await usersApi.create({
        studentId: formData.studentId.trim(),
        name: formData.name.trim(),
        password: formData.password,
        role: formData.role,
      });
      toast.success('用户创建成功');
      setCreateDialogOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error((err as Error).message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (): Promise<void> => {
    if (!currentUser) return;
    if (!formData.name.trim()) {
      toast.error('请输入姓名');
      return;
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast.error('邮箱格式不正确');
      return;
    }
    setSubmitting(true);
    try {
      await usersApi.update(currentUser.id, {
        name: formData.name.trim(),
        role: formData.role,
        status: formData.status,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      });
      toast.success('用户信息已更新');
      setEditDialogOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error((err as Error).message || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (): Promise<void> => {
    if (!currentUser) return;
    if (!newPassword || newPassword.length < 6) {
      toast.error('密码至少6位');
      return;
    }
    setResetSubmitting(true);
    try {
      await usersApi.resetPassword(currentUser.id, newPassword);
      toast.success('密码已重置');
      setResetDialogOpen(false);
    } catch (err) {
      toast.error((err as Error).message || '重置失败');
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleToggle = async (): Promise<void> => {
    if (!toggleUser) return;
    try {
      await usersApi.toggleStatus(toggleUser.id);
      toast.success(toggleUser.status === 'active' ? '已禁用' : '已启用');
      setToggleDialogOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error((err as Error).message || '操作失败');
    }
  };

  const openDelete = (user: UserInfo): void => {
    setDeleteUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteUser) return;
    setDeleteSubmitting(true);
    try {
      await usersApi.remove(deleteUser.id);
      toast.success('账号已删除');
      setDeleteDialogOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error((err as Error).message || '删除失败');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const columns: TableProps<UserInfo>['columns'] = [
    { title: '学号', dataIndex: 'studentId', width: 140, fixed: 'left' },
    { title: '姓名', dataIndex: 'name', width: 100 },
    {
      title: '角色',
      dataIndex: 'role',
      width: 100,
      render: (val: UserRole) => (
        <span
          className={`status-badge ${val === 'admin' ? 'stored' : ''}`}
          style={
            val === 'student'
              ? { background: 'hsl(215 15% 92%)', color: 'hsl(215 20% 35%)' }
              : undefined
          }
        >
          {USER_ROLE_LABELS[val]}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (val: UStatus) => (
        <span className={`status-badge ${val}`}>{USER_STATUS_LABELS[val]}</span>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      width: 180,
      render: (val: string | undefined) => val || '-',
    },
    { title: '手机号', dataIndex: 'phone', width: 130, className: 'tnum' },
    {
      title: '来源',
      dataIndex: 'registerSource',
      width: 100,
      render: (val: string) => (
        <span style={{ color: 'hsl(215 20% 45%)' }}>
          {REGISTER_SOURCE_LABELS[val as keyof typeof REGISTER_SOURCE_LABELS] || '管理员创建'}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 170,
      className: 'tnum',
      render: (val: string) => new Date(val).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 420,
      render: (_: unknown, record: UserInfo) => (
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" onClick={() => openEdit(record)}>
            <Pencil size={14} />
            编辑
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openReset(record)}>
            <Key size={14} />
            重置密码
          </Button>
          {record.status === 'pending' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-success"
                onClick={() => handleApprove(record.id)}
                disabled={approveLoadingId === record.id}
              >
                <CheckCircle size={14} />
                通过
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => openReject(record)}
              >
                <XCircle size={14} />
                拒绝
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => openDelete(record)}
              >
                <Trash2 size={14} />
                删除
              </Button>
            </>
          )}
          {record.status === 'active' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => openToggle(record)}
            >
              <Power size={14} />
              禁用
            </Button>
          )}
          {record.status === 'disabled' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-success"
                onClick={() => openToggle(record)}
              >
                <Power size={14} />
                启用
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => openDelete(record)}
              >
                <Trash2 size={14} />
                删除
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (loading && users.length === 0) {
    return (
      <div className="space-y-4 rise">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-semibold">账号管理</h1>
        </div>
        <div className="rounded-md border bg-card p-4">
          <div className="grid grid-cols-4 gap-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i: number) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rise">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">账号管理</h1>
        <Button onClick={openCreate}>
          <Plus size={14} />
          新增学生
        </Button>
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">关键词</Label>
            <div className="flex gap-2">
              <Input
                placeholder="学号/姓名/邮箱"
                value={keyword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setKeyword(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') handleSearch();
                }}
              />
              <Button onClick={handleSearch}>
                <Search size={14} />
                搜索
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">角色</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="全部角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部角色</SelectItem>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {USER_ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">状态</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部状态</SelectItem>
                {USER_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {USER_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table<UserInfo>
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000, y: 520 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: false,
            showTotal: (t: number) => `共 ${t} 条`,
            onChange: (p: number) => setPage(p),
          }}
        />
      </div>

      {/* 新增学生 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增学生</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>
                学号 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.studentId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, studentId: e.target.value })
                }
                placeholder="请输入学号"
              />
            </div>
            <div className="space-y-1">
              <Label>
                姓名 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="请输入姓名"
              />
            </div>
            <div className="space-y-1">
              <Label>
                初始密码 <span className="text-destructive">*</span>
              </Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="至少6位"
              />
            </div>
            <div className="space-y-1">
              <Label>
                角色 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(v: string) =>
                  setFormData({ ...formData, role: v as UserRole })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {USER_ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>邮箱</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="选填，用于接收通知"
              />
            </div>
            <div className="space-y-1">
              <Label>手机号</Label>
              <Input
                value={formData.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="选填"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={submitting}>
                取消
              </Button>
            </DialogClose>
            <Button onClick={handleCreate} disabled={submitting}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑用户 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户 - {currentUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>学号</Label>
              <Input value={formData.studentId} disabled />
            </div>
            <div className="space-y-1">
              <Label>
                姓名 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>角色</Label>
              <Select
                value={formData.role}
                onValueChange={(v: string) =>
                  setFormData({ ...formData, role: v as UserRole })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {USER_ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>状态</Label>
              <Select
                value={formData.status}
                onValueChange={(v: string) =>
                  setFormData({ ...formData, status: v as UStatus })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {USER_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>邮箱</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="选填，用于接收通知"
              />
            </div>
            <div className="space-y-1">
              <Label>手机号</Label>
              <Input
                value={formData.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={submitting}>
                取消
              </Button>
            </DialogClose>
            <Button onClick={handleEdit} disabled={submitting}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重置密码 */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置密码 - {currentUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>
                新密码 <span className="text-destructive">*</span>
              </Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewPassword(e.target.value)
                }
                placeholder="请输入新密码，至少6位"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={resetSubmitting}>
                取消
              </Button>
            </DialogClose>
            <Button onClick={handleResetPassword} disabled={resetSubmitting}>
              确认重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 启用/禁用确认 */}
      <AlertDialog open={toggleDialogOpen} onOpenChange={setToggleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleUser?.status === 'active' ? '确认禁用' : '确认启用'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要{toggleUser?.status === 'active' ? '禁用' : '启用'}用户「
              {toggleUser?.name}」吗？
              {toggleUser?.status === 'active' && '禁用后该用户将无法登录。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggle}
              className={
                toggleUser?.status === 'active'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 拒绝审批 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝注册申请</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">拒绝原因</Label>
              <Textarea
                value={rejectRemark}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setRejectRemark(e.target.value)
                }
                placeholder="请说明拒绝原因（可选）"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">取消</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleReject} disabled={rejectSubmitting}>
              {rejectSubmitting ? '提交中...' : '确认拒绝'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              确认删除账号
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除用户「{deleteUser?.name}」（学号：{deleteUser?.studentId}）吗？
              <br />
              <br />
              <span className="text-destructive font-medium">此操作不可恢复：</span>
              <br />
              • 删除后该账号将无法再登录
              <br />
              • 该学号将被释放，可重新注册
              <br />
              • 历史采购订单和库存台账数据仍会保留（以姓名快照形式展示）
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSubmitting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersPage;
