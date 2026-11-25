import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  Users,
  Settings,
  LogOut,
  ClipboardList,
  FileText,
  User,
  AlertTriangle,
  Mail,
} from 'lucide-react';
import { useAuth } from '@client/src/contexts/AuthContext';
import { usersApi, purchaseApi } from '@client/src/api';
import { logger } from '@client/src/lib/logger';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const LAST_ORDER_VIEW_KEY = 'lab_last_order_view_time';

const studentNav: NavItem[] = [
  { to: '/purchase/new', label: '采购申请', icon: <ShoppingCart size={16} /> },
  { to: '/purchase/my', label: '我的订单', icon: <ClipboardList size={16} /> },
  { to: '/inventory', label: '库存台账', icon: <Package size={16} /> },
  { to: '/profile', label: '个人中心', icon: <User size={16} /> },
];

const adminNav: NavItem[] = [
  { to: '/purchase', label: '采购管理', icon: <ShoppingCart size={16} /> },
  { to: '/inventory', label: '库存台账', icon: <Package size={16} /> },
  { to: '/hazardous-chemicals', label: '危化品目录', icon: <AlertTriangle size={16} /> },
  { to: '/users', label: '账号管理', icon: <Users size={16} /> },
  { to: '/email-config', label: '邮件配置', icon: <Mail size={16} /> },
  { to: '/logs', label: '操作日志', icon: <FileText size={16} /> },
  { to: '/profile', label: '个人中心', icon: <User size={16} /> },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [badges, setBadges] = useState<Record<string, number>>({});

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!user) return;

    const fetchBadges = async (): Promise<void> => {
      try {
        if (isAdmin) {
          const [usersRes, ordersRes] = await Promise.all([
            usersApi.getPendingCount(),
            purchaseApi.getPendingCount(),
          ]);
          setBadges({
            '/users': usersRes.count,
            '/purchase': ordersRes.count,
          });
        } else {
          const since = localStorage.getItem(LAST_ORDER_VIEW_KEY) || undefined;
          const res = await purchaseApi.getMyBadgeCount(since);
          const total = res.pendingStoreCount + res.newApprovalCount;
          setBadges({ '/purchase/my': total });
        }
      } catch (err) {
        logger.debug('获取待办角标失败', err);
      }
    };

    fetchBadges();
    const timer = setInterval(fetchBadges, 60000);
    return () => clearInterval(timer);
  }, [user, isAdmin]);

  useEffect(() => {
    if (!isAdmin && location.pathname.startsWith('/purchase/my')) {
      localStorage.setItem(LAST_ORDER_VIEW_KEY, new Date().toISOString());
      setBadges((prev) => ({ ...prev, '/purchase/my': 0 }));
    }
  }, [location.pathname, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    if (location.pathname.startsWith('/users')) {
      setBadges((prev) => ({ ...prev, '/users': 0 }));
    }
    if (location.pathname.startsWith('/purchase')) {
      setBadges((prev) => ({ ...prev, '/purchase': 0 }));
    }
  }, [location.pathname, isAdmin]);

  const navItems = (isAdmin ? adminNav : studentNav).map((item) => ({
    ...item,
    badge: badges[item.to],
  }));

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };

  const pageTitle = navItems.find((item) => location.pathname.startsWith(item.to))?.label || '';

  const renderBadge = (count?: number): React.ReactNode => {
    if (!count || count <= 0) return null;
    const display = count > 99 ? '99+' : count;
    return (
      <span
        className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-medium text-white"
        style={{ height: '18px' }}
      >
        {display}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      <aside className="flex w-[220px] flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
          <h1 className="font-display text-base font-semibold text-white">
            课题组耗材管理
          </h1>
        </div>

        <nav className="flex-1 py-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground border-r-2 border-sidebar-primary'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`
              }
            >
              {item.icon}
              <span className="flex-1 truncate">{item.label}</span>
              {renderBadge(item.badge)}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 px-1 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-xs text-sidebar-foreground/60">
                {isAdmin ? '管理员' : '学生'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground rounded transition-colors"
          >
            <LogOut size={14} />
            退出登录
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
          <h2 className="text-base font-semibold font-display">{pageTitle}</h2>
        </header>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
