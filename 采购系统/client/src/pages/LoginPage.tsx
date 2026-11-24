import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FlaskConical } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { useAuth } from '@client/src/contexts/AuthContext';

interface LocationState {
  from?: string;
  registered?: boolean;
}

const LoginPage: React.FC = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ studentId?: string; password?: string; general?: string }>({});
  const { login, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as LocationState)?.from;
  const registered = (location.state as LocationState)?.registered;

  useEffect(() => {
    if (registered) {
      toast.success('注册申请已提交，请等待管理员审批');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      const target = from ?? (user.role === 'admin' ? '/purchase' : '/purchase/new');
      navigate(target, { replace: true });
    }
  }, [user, navigate, from]);

  const validate = (): boolean => {
    const newErrors: { studentId?: string; password?: string } = {};
    if (!studentId.trim()) {
      newErrors.studentId = '请输入学号';
    }
    if (!password) {
      newErrors.password = '请输入密码';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const result = await login(studentId.trim(), password);
      toast.success('登录成功');
      const target = from ?? (result.role === 'admin' ? '/purchase' : '/purchase/new');
      navigate(target, { replace: true });
    } catch (err) {
      const message = (err as Error).message || '登录失败，请检查学号和密码';
      setErrors({ general: message });
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rise">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FlaskConical size={24} />
          </div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            课题组耗材管理系统
          </h1>
        </div>

        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">账号登录</CardTitle>
            <CardDescription className="text-xs">
              请使用学号和密码登录系统
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="studentId" className="text-xs">
                  学号
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
                <Label htmlFor="password" className="text-xs">
                  密码
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
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              {errors.general && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {errors.general}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '登录中...' : '登 录'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 flex items-center justify-center gap-1 text-xs text-muted-foreground">
          还没有账号？
          <Link to="/register" className="text-primary hover:underline">
            学生自助注册
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
