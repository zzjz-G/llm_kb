import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FlaskConical, ArrowLeft } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { Textarea } from '@client/src/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { authApi } from '@client/src/api';

interface FormErrors {
  studentId?: string;
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  receiveName?: string;
  receivePhone?: string;
  receiveAddress?: string;
  general?: string;
}

const RegisterPage: React.FC = () => {
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [receiveName, setReceiveName] = useState('');
  const [receivePhone, setReceivePhone] = useState('');
  const [receiveAddress, setReceiveAddress] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!studentId.trim()) {
      newErrors.studentId = '请输入学号';
    }
    if (!name.trim()) {
      newErrors.name = '请输入姓名';
    }
    if (!email.trim()) {
      newErrors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = '邮箱格式不正确';
    }
    if (!password) {
      newErrors.password = '请输入密码';
    } else if (password.length < 6) {
      newErrors.password = '密码长度不能少于6位';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = '请确认密码';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }
    if (!receiveName.trim()) {
      newErrors.receiveName = '请填写联系人';
    }
    if (!receivePhone.trim()) {
      newErrors.receivePhone = '请填写联系电话';
    } else if (!/^1[3-9]\d{9}$/.test(receivePhone.trim())) {
      newErrors.receivePhone = '手机号格式不正确';
    }
    if (!receiveAddress.trim()) {
      newErrors.receiveAddress = '请填写收件地址';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await authApi.register({
        studentId: studentId.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        receiveName: receiveName.trim(),
        receivePhone: receivePhone.trim(),
        receiveAddress: receiveAddress.trim(),
      });
      toast.success('注册提交成功，请等待管理员审批');
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      const message = (err as Error).message || '注册失败，请稍后重试';
      if (message.includes('学号已注册') || message.includes('已存在')) {
        setErrors({ studentId: message });
      } else if (message.includes('密码不一致') || message.includes('密码长度')) {
        setErrors({ password: message });
      } else if (message.includes('手机号')) {
        setErrors({ receivePhone: message });
      } else if (message.includes('联系人')) {
        setErrors({ receiveName: message });
      } else if (message.includes('收件地址')) {
        setErrors({ receiveAddress: message });
      } else if (message.includes('邮箱')) {
        setErrors({ email: message });
      } else {
        setErrors({ general: message });
      }
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-xl rise">
        <div className="mb-7 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FlaskConical size={26} />
          </div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            课题组耗材管理系统
          </h1>
        </div>

        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-5">
            <CardTitle className="text-base font-semibold">学生自助注册</CardTitle>
            <CardDescription className="text-xs">
              注册后等待管理员审批通过即可登录
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-0.5 rounded-full bg-primary" />
                  <h3 className="text-sm font-semibold text-foreground">账号信息</h3>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="studentId" className="text-xs">
                      学号 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="studentId"
                      type="text"
                      value={studentId}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setStudentId(e.target.value);
                        if (errors.studentId) {
                          setErrors((prev) => ({ ...prev, studentId: undefined }));
                        }
                      }}
                      placeholder="请输入学号"
                      autoComplete="username"
                      disabled={isLoading}
                    />
                    {errors.studentId && (
                      <p className="text-xs text-destructive">{errors.studentId}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs">
                      姓名 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setName(e.target.value);
                        if (errors.name) {
                          setErrors((prev) => ({ ...prev, name: undefined }));
                        }
                      }}
                      placeholder="请输入姓名"
                      autoComplete="name"
                      disabled={isLoading}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">
                    邮箱 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setEmail(e.target.value);
                      if (errors.email) {
                        setErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    placeholder="请输入邮箱地址（用于接收审批通知）"
                    autoComplete="email"
                    disabled={isLoading}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs">
                      密码 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setPassword(e.target.value);
                        if (errors.password) {
                          setErrors((prev) => ({ ...prev, password: undefined }));
                        }
                      }}
                      placeholder="至少6位"
                      autoComplete="new-password"
                      disabled={isLoading}
                    />
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs">
                      确认密码 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) {
                          setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }
                      }}
                      placeholder="请再次输入密码"
                      autoComplete="new-password"
                      disabled={isLoading}
                    />
                    {errors.confirmPassword && (
                      <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </section>

              <div className="h-px bg-border" />

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-0.5 rounded-full bg-primary" />
                  <h3 className="text-sm font-semibold text-foreground">收货信息</h3>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="receiveName" className="text-xs">
                      联系人 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="receiveName"
                      type="text"
                      value={receiveName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setReceiveName(e.target.value);
                        if (errors.receiveName) {
                          setErrors((prev) => ({ ...prev, receiveName: undefined }));
                        }
                      }}
                      placeholder="收货人姓名"
                      disabled={isLoading}
                    />
                    {errors.receiveName && (
                      <p className="text-xs text-destructive">{errors.receiveName}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="receivePhone" className="text-xs">
                      联系电话 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="receivePhone"
                      type="tel"
                      value={receivePhone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setReceivePhone(e.target.value);
                        if (errors.receivePhone) {
                          setErrors((prev) => ({ ...prev, receivePhone: undefined }));
                        }
                      }}
                      placeholder="11位手机号"
                      disabled={isLoading}
                    />
                    {errors.receivePhone && (
                      <p className="text-xs text-destructive">{errors.receivePhone}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="receiveAddress" className="text-xs">
                    收件地址 <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="receiveAddress"
                    value={receiveAddress}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                      setReceiveAddress(e.target.value);
                      if (errors.receiveAddress) {
                        setErrors((prev) => ({ ...prev, receiveAddress: undefined }));
                      }
                    }}
                    placeholder="请输入详细收件地址"
                    rows={2}
                    disabled={isLoading}
                  />
                  {errors.receiveAddress && (
                    <p className="text-xs text-destructive">{errors.receiveAddress}</p>
                  )}
                </div>
              </section>

              {errors.general && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {errors.general}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? '提交中...' : '提交注册申请'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <Link to="/login" className="flex items-center gap-1 text-primary hover:underline">
            <ArrowLeft size={12} />
            返回登录
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
