import React, { useState, useEffect } from 'react';
import { Mail, Save, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { Switch } from '@client/src/components/ui/switch';
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
import { Skeleton } from '@client/src/components/ui/skeleton';
import { Badge } from '@client/src/components/ui/badge';
import { emailApi } from '@client/src/api';
import type { EmailConfigInfo, SaveEmailConfigRequest } from '@shared/api.interface';

interface ConfigFormData {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
  senderName: string;
  isActive: boolean;
}

const EmailConfigPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testError, setTestError] = useState('');
  const [formError, setFormError] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ConfigFormData>({
    smtpHost: '',
    smtpPort: '465',
    smtpUser: '',
    smtpPass: '',
    smtpSecure: true,
    senderName: '课题组采购系统',
    isActive: false,
  });

  useEffect(() => {
    let mounted = true;
    emailApi
      .getConfig()
      .then((config: EmailConfigInfo | null) => {
        if (!mounted) return;
        if (config) {
          setFormData({
            smtpHost: config.smtpHost,
            smtpPort: String(config.smtpPort),
            smtpUser: config.smtpUser,
            smtpPass: '',
            smtpSecure: config.smtpSecure,
            senderName: config.senderName,
            isActive: config.isActive,
          });
        }
      })
      .catch((err: Error) => {
        if (!mounted) return;
        toast.error(err.message || '加载配置失败');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handlePortChange = (value: string): void => {
    setFormData((prev) => ({ ...prev, smtpPort: value }));
    const port = Number(value);
    if (port === 465) {
      setFormData((prev) => ({ ...prev, smtpSecure: true }));
    } else if (port === 587) {
      setFormData((prev) => ({ ...prev, smtpSecure: false }));
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.smtpHost.trim()) {
      errs.smtpHost = '请输入SMTP服务器地址';
    }
    if (!formData.smtpPort || Number.isNaN(Number(formData.smtpPort))) {
      errs.smtpPort = '请输入端口号';
    } else if (Number(formData.smtpPort) < 1 || Number(formData.smtpPort) > 65535) {
      errs.smtpPort = '端口号范围 1-65535';
    }
    if (!formData.smtpUser.trim()) {
      errs.smtpUser = '请输入发件邮箱账号';
    }
    if (!formData.smtpPass) {
      errs.smtpPass = '请输入SMTP授权码或密码';
    }
    setFormError(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (): Promise<void> => {
    if (!validate()) return;
    setSaving(true);
    setSaved(false);
    try {
      const payload: SaveEmailConfigRequest = {
        smtpHost: formData.smtpHost.trim(),
        smtpPort: Number(formData.smtpPort),
        smtpUser: formData.smtpUser.trim(),
        smtpPass: formData.smtpPass,
        smtpSecure: formData.smtpSecure,
        senderName: formData.senderName.trim() || '课题组采购系统',
        isActive: formData.isActive,
      };
      await emailApi.saveConfig(payload);
      setSaved(true);
      toast.success('配置已保存');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error((err as Error).message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async (): Promise<void> => {
    if (!testEmail.trim()) {
      setTestError('请输入收件邮箱');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail.trim())) {
      setTestError('邮箱格式不正确');
      return;
    }
    setTestError('');
    setTesting(true);
    try {
      const result = await emailApi.testEmail(testEmail.trim());
      if (result.success) {
        toast.success('测试邮件发送成功');
        setTestDialogOpen(false);
        setTestEmail('');
      } else {
        toast.error(result.message || '测试邮件发送失败');
      }
    } catch (err) {
      toast.error((err as Error).message || '测试邮件发送失败');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 rise">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-semibold">邮件配置</h1>
        </div>
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 6 }).map((_, i: number) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 rise">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">邮件配置</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            配置 SMTP 发件服务器，用于发送采购申请、审批等通知邮件
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={formData.isActive ? 'default' : 'secondary'}>
            {formData.isActive ? '已启用' : '未启用'}
          </Badge>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-4 py-2 text-sm text-success">
          <CheckCircle2 size={16} />
          配置已保存
        </div>
      )}

      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-primary" />
            <CardTitle className="text-sm font-semibold">SMTP 配置</CardTitle>
          </div>
          <CardDescription className="text-xs">
            邮件发送失败不会影响正常业务流程，请确保 SMTP 配置正确
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="smtpHost" className="text-xs">
                SMTP 服务器地址 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="smtpHost"
                value={formData.smtpHost}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, smtpHost: e.target.value })
                }
                placeholder="如 smtp.qq.com、smtp.gmail.com"
              />
              {formError.smtpHost && (
                <p className="text-xs text-destructive">{formError.smtpHost}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="smtpPort" className="text-xs">
                端口 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="smtpPort"
                type="number"
                value={formData.smtpPort}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handlePortChange(e.target.value)
                }
                placeholder="默认 465"
                className="tnum"
              />
              {formError.smtpPort && (
                <p className="text-xs text-destructive">{formError.smtpPort}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div className="space-y-0.5">
              <Label className="text-xs">加密方式</Label>
              <p className="text-xs text-muted-foreground">
                {formData.smtpSecure ? 'SSL/TLS 加密' : '不加密'}
              </p>
            </div>
            <Switch
              checked={formData.smtpSecure}
              onCheckedChange={(checked: boolean) =>
                setFormData({ ...formData, smtpSecure: checked })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="smtpUser" className="text-xs">
                发件邮箱账号 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="smtpUser"
                type="email"
                value={formData.smtpUser}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, smtpUser: e.target.value })
                }
                placeholder="your-email@example.com"
              />
              {formError.smtpUser && (
                <p className="text-xs text-destructive">{formError.smtpUser}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="smtpPass" className="text-xs">
                授权码/密码 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="smtpPass"
                type="password"
                value={formData.smtpPass}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, smtpPass: e.target.value })
                }
                placeholder="请输入SMTP授权码或密码"
              />
              {formError.smtpPass && (
                <p className="text-xs text-destructive">{formError.smtpPass}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="senderName" className="text-xs">
              发件人显示名
            </Label>
            <Input
              id="senderName"
              value={formData.senderName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, senderName: e.target.value })
              }
              placeholder="课题组采购系统"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div className="space-y-0.5">
              <Label className="text-xs">是否启用</Label>
              <p className="text-xs text-muted-foreground">
                启用后系统才会真正发送通知邮件
              </p>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked: boolean) =>
                setFormData({ ...formData, isActive: checked })
              }
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button onClick={handleSave} disabled={saving}>
              <Save size={14} />
              {saving ? '保存中...' : '保存配置'}
            </Button>

            <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Send size={14} />
                  发送测试邮件
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-base">发送测试邮件</DialogTitle>
                  <DialogDescription className="text-xs">
                    输入收件邮箱地址，发送一封测试邮件验证配置是否正确
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                  <Label htmlFor="testEmail" className="text-xs">
                    收件邮箱 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="testEmail"
                    type="email"
                    value={testEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setTestEmail(e.target.value);
                      if (testError) setTestError('');
                    }}
                    placeholder="请输入收件邮箱地址"
                  />
                  {testError && (
                    <p className="text-xs text-destructive">{testError}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setTestDialogOpen(false)}
                    disabled={testing}
                  >
                    取消
                  </Button>
                  <Button onClick={handleTestEmail} disabled={testing}>
                    {testing ? '发送中...' : '确认发送'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfigPage;
