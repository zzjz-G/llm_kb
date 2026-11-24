import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, type TableProps } from '@lark-apaas/client-toolkit/antd-table';
import { ClipboardList, Trash2, Eye, Search, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Empty, EmptyHeader } from '@client/src/components/ui/empty';
import { Skeleton } from '@client/src/components/ui/skeleton';

import { purchaseApi } from '@client/src/api';
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
} from '@shared/api.interface';
import type { PurchaseOrder, OrderStatus } from '@shared/api.interface';

const STATUS_FILTER_OPTIONS = ['all', ...ORDER_STATUSES] as const;
type StatusFilterValue = (typeof STATUS_FILTER_OPTIONS)[number];

const PurchaseMyPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<StatusFilterValue>('all');
  const [keyword, setKeyword] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page: number; pageSize: number; status?: string; keyword?: string } = {
        page,
        pageSize,
      };
      if (status !== 'all') params.status = status;
      if (keyword.trim()) params.keyword = keyword.trim();

      const result = await purchaseApi.myOrders(params);
      setOrders(result.items);
      setTotal(result.total);
    } catch (err) {
      const msg = (err as Error).message || '加载失败';
      toast.error(msg);
      logger.error('加载我的订单失败', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, keyword]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const handleSearch = useCallback(() => {
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((val: string) => {
    setStatus(val as StatusFilterValue);
    setPage(1);
  }, []);

  const handleDelete = useCallback((order: PurchaseOrder) => {
    setDeletingOrder(order);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingOrder) return;
    setIsDeleting(true);
    try {
      await purchaseApi.deleteOrder(deletingOrder.id);
      toast.success('删除成功');
      setDeleteDialogOpen(false);
      setDeletingOrder(null);
      void fetchOrders();
    } catch (err) {
      const msg = (err as Error).message || '删除失败';
      toast.error(msg);
      logger.error('删除订单失败', err);
    } finally {
      setIsDeleting(false);
    }
  }, [deletingOrder, fetchOrders]);

  const columns: TableProps<PurchaseOrder>['columns'] = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      width: 200,
      className: 'tnum',
      render: (val: string) => <span className="font-medium tnum">{val}</span>,
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      width: 180,
      className: 'tnum',
      render: (val: string) => new Date(val).toLocaleString('zh-CN'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (val: OrderStatus) => (
        <span className={`status-badge ${val}`}>{ORDER_STATUS_LABELS[val]}</span>
      ),
    },
    {
      title: '物品种类数',
      dataIndex: 'items',
      width: 100,
      className: 'tnum',
      render: (_: unknown, record: PurchaseOrder) => (
        <span className="tnum">{record.items?.length || 0}</span>
      ),
    },
    {
      title: '预估合计',
      dataIndex: 'totalAmount',
      width: 120,
      className: 'tnum',
      render: (val: number) => <span className="tnum">¥ {(val || 0).toFixed(2)}</span>,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 220,
      render: (_: unknown, record: PurchaseOrder) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/orders/${record.id}`)}>
            <Eye size={14} />
            查看
          </Button>
          {record.status === 'stored' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate(`/orders/${record.id}`)}
              className="gap-1"
            >
              <Pencil size={14} />
              去补填
            </Button>
          )}
          {record.status === 'pending' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => handleDelete(record)}
            >
              <Trash2 size={14} />
              删除
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 rise">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="text-primary" size={22} />
          <h1 className="text-xl font-semibold font-display">我的订单</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-40">
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input
            className="pl-9"
            placeholder="搜索订单号或物料名称"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>
          搜索
        </Button>
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Empty className="py-12">
            <EmptyHeader>
              <p className="text-base font-medium">暂无订单</p>
              <p className="text-sm text-muted-foreground">
                您还没有采购订单，去提交第一笔申请吧
              </p>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={orders}
            rowKey="id"
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: (p: number) => setPage(p),
              showSizeChanger: false,
            }}
            scroll={{ x: 900, y: 500 }}
          />
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除订单{' '}
              <span className="font-medium tnum">{deletingOrder?.orderNo}</span> 吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseMyPage;
