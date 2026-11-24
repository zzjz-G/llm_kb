import React, { useState } from 'react';
import { toast } from 'sonner';
import { User, Package, Key, Save } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { Label } from '@client/src/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/src/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@client/src/components/ui/dialog';
import { USER_ROLE_LABELS } from '@shared/api.interface';
import { useAuth } from '@client/src/contexts/AuthContext';
import { usersApi } from '@client/src/api';

interface BasicFormData {
  name: string;
  email: string;
  phone: string;
}

interface ProfileFormData {
  receiveName: string;
  receivePhone: string;
  receiveAddress: string;
}

interface PasswordFormData {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [basicForm, setBasicForm] = useState<BasicFormData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [basicError, setBasicError] = useState<string>('');
  const [basicSaving, setBasicSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    receiveName: user?.receiveName || '',
    receivePhone: user?.receivePhone || '',
    receiveAddress: user?.receiveAddress || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Partial<PasswordFormData>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const handleBasicFieldChange = (field: keyof BasicFormData, value: string): void => {
    setBasicForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveBasic = async (): Promise<void> => {
    if (basicForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(basicForm.email.trim())) {
      setBasicError('邮箱格式不正确');
      return;
    }
    setBasicError('');
    setBasicSaving(true);
    try {
      await usersApi.updateProfile({
        name: basicForm.name.trim() || undefined,
        email: basicForm.email.trim() || undefined,
        phone: basicForm.phone.trim() || undefined,
      });
      await refreshUser();
      toast.success('基本信息已保存');
    } catch (err) {
      toast.error((err as Error).message || '保存失败');
    } finally {
      setBasicSaving(false);
    }
  };

  const handleFieldChange = (field: keyof ProfileFormData, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (): Promise<void> => {
    setIsSaving(true);
    try {
      await usersApi.updateProfile({
        receiveName: formData.receiveName || undefined,
        receivePhone: formData.receivePhone || undefined,
        receiveAddress: formData.receiveAddress || undefined,
      });
      await refreshUser();
      toast.success('收货信息已保存');
    } catch (err) {
      toast.error((err as Error).message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const validatePassword = (): boolean => {
    const errs: Partial<PasswordFormData> = {};
    if (!passwordData.oldPassword) {
      errs.oldPassword = '请输入旧密码';
    }
    if (!passwordData.newPassword) {
      errs.newPassword = '请输入新密码';
    } else if (passwordData.newPassword.length < 6) {
      errs.newPassword = '新密码长度至少6位';
    }
    if (!passwordData.confirmPassword) {
      errs.confirmPassword = '请再次输入新密码';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errs.confirmPassword = '两次输入的密码不一致';
    }
    setPasswordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePasswordFieldChange = (field: keyof PasswordFormData, value: string): void => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
    if (passwordErrors[field]) {
      setPasswordErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    if (!validatePassword()) return;

    setIsChangingPassword(true);
    try {
      await usersApi.changePassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('密码修改成功');
      setPasswordDialogOpen(false);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
    } catch (err) {
      toast.error((err as Error).message || '密码修改失败');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDialogOpenChange = (open: boolean): void => {
    setPasswordDialogOpen(open);
    if (!open) {
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-4 rise">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold font-display">个人中心</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 基本信息 */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <User size={16} className="text-primary" />
              <CardTitle className="text-sm font-semibold">基本信息</CardTitle>
            </div>
            <CardDescription className="text-xs">
              账号基本信息，可修改姓名和手机号
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="userName" className="text-xs">
                姓名
              </Label>
              <Input
                id="userName"
                value={basicForm.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleBasicFieldChange('name', e.target.value)
                }
                placeholder="请输入姓名"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">学号</Label>
              <div className="h-9 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm tnum">
                {user.studentId}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">角色</Label>
              <div className="h-9 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                {USER_ROLE_LABELS[user.role]}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="userEmail" className="text-xs">
                邮箱
              </Label>
              <Input
                id="userEmail"
                type="email"
                value={basicForm.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  handleBasicFieldChange('email', e.target.value);
                  if (basicError) setBasicError('');
                }}
                placeholder="请输入邮箱地址"
              />
              {basicError && (
                <p className="text-xs text-destructive">{basicError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                邮箱用于接收采购审批、入库等通知邮件，选填
              </p>
              {!user.email && (
                <p className="text-xs text-amber-600">
                  您尚未设置邮箱，将无法接收邮件通知
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="userPhone" className="text-xs">
                手机号
              </Label>
              <Input
                id="userPhone"
                value={basicForm.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleBasicFieldChange('phone', e.target.value)
                }
                placeholder="请输入手机号"
                className="tnum"
              />
            </div>
            <div className="pt-1">
              <Button onClick={handleSaveBasic} disabled={basicSaving}>
                <Save size={14} />
                {basicSaving ? '保存中...' : '保存基本信息'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 收货信息 */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-primary" />
              <CardTitle className="text-sm font-semibold">收货信息</CardTitle>
            </div>
            <CardDescription className="text-xs">
              采购订单发货时使用，可随时修改
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="receiveName" className="text-xs">
                收货姓名
              </Label>
              <Input
                id="receiveName"
                value={formData.receiveName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleFieldChange('receiveName', e.target.value)
                }
                placeholder="请输入收货姓名"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="receivePhone" className="text-xs">
                收货手机号
              </Label>
              <Input
                id="receivePhone"
                value={formData.receivePhone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleFieldChange('receivePhone', e.target.value)
                }
                placeholder="请输入收货手机号"
                className="tnum"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="receiveAddress" className="text-xs">
                收货地址
              </Label>
              <Textarea
                id="receiveAddress"
                value={formData.receiveAddress}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  handleFieldChange('receiveAddress', e.target.value)
                }
                placeholder="请输入详细收货地址"
                rows={3}
              />
            </div>
            <div className="pt-1">
              <Button onClick={handleSaveProfile} disabled={isSaving}>
                <Save size={14} />
                {isSaving ? '保存中...' : '保存收货信息'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 修改密码 */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-primary" />
            <CardTitle className="text-sm font-semibold">账号安全</CardTitle>
          </div>
          <CardDescription className="text-xs">
            定期修改密码以保障账号安全
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={passwordDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <Key size={14} />
                修改密码
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-base">修改密码</DialogTitle>
                <DialogDescription className="text-xs">
                  请输入当前密码和新密码，新密码长度至少6位
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="oldPassword" className="text-xs">
                    当前密码
                  </Label>
                  <Input
                    id="oldPassword"
                    type="password"
                    value={passwordData.oldPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handlePasswordFieldChange('oldPassword', e.target.value)
                    }
                    placeholder="请输入当前密码"
                    autoComplete="current-password"
                  />
                  {passwordErrors.oldPassword && (
                    <p className="text-xs text-destructive">
                      {passwordErrors.oldPassword}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs">
                    新密码
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handlePasswordFieldChange('newPassword', e.target.value)
                    }
                    placeholder="请输入新密码（至少6位）"
                    autoComplete="new-password"
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-xs text-destructive">
                      {passwordErrors.newPassword}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs">
                    确认新密码
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handlePasswordFieldChange('confirmPassword', e.target.value)
                    }
                    placeholder="请再次输入新密码"
                    autoComplete="new-password"
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {passwordErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="secondary"
                  onClick={() => handleDialogOpenChange(false)}
                  disabled={isChangingPassword}
                >
                  取消
                </Button>
                <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                  {isChangingPassword ? '提交中...' : '确认修改'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
