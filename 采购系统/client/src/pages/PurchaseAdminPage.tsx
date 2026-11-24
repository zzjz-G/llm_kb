import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableProps } from '@lark-apaas/client-toolkit/antd-table';
import { Search, Download, Eye, CheckCircle, XCircle } from 'lucide-react';
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
} from '@client/src/components/ui/dialog';
import { Textarea } from '@client/src/components/ui/textarea';
import { Label } from '@client/src/components/ui/label';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { purchaseApi, exportApi, usersApi } from '@client/src/api';
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
} from '@shared/api.interface';
import type { PurchaseOrder, OrderStatus, UserInfo } from '@shared/api.interface';
import { useNavigate } from 'react-router-dom';

const PurchaseAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [applicantId, setApplicantId] = useState<string>('');
  const [applicants, setApplicants] = useState<UserInfo[]>([]);

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<PurchaseOrder | null>(null);
  const [reviewRemark, setReviewRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const params: {
      page: number;
      pageSize: number;
      status?: string;
      keyword?: string;
      applicantId?: string;
    } = { page, pageSize };
    if (statusFilter) params.status = statusFilter;
    if (keyword.trim()) params.keyword = keyword.trim();
    if (applicantId) params.applicantId = applicantId;

    purchaseApi
      .allOrders(params)
      .then((res) => {
        setOrders(res.items);
        setTotal(res.total);
      })
      .catch((err: Error) => {
        toast.error(err.message || '加载订单列表失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, pageSize, statusFilter, keyword, applicantId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    usersApi
      .list({ pageSize: 100, role: 'student', status: 'active' })
      .then((res) => {
        setApplicants(res.items);
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  const handleSearch = (): void => {
    setPage(1);
  };

  const openReview = (order: PurchaseOrder): void => {
    setReviewOrder(order);
    setReviewRemark('');
    setReviewDialogOpen(true);
  };

  const handleApprove = async (): Promise<void> => {
    if (!reviewOrder) return;
    setSubmitting(true);
    try {
      await purchaseApi.approve(reviewOrder.id, reviewRemark || undefined);
      toast.success('审核通过');
      setReviewDialogOpen(false);
      fetchOrders();
    } catch (err) {
      toast.error((err as Error).message || '审核失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (): Promise<void> => {
    if (!reviewOrder) return;
    setSubmitting(true);
    try {
      await purchaseApi.reject(reviewOrder.id, reviewRemark || undefined);
      toast.success('已驳回');
      setReviewDialogOpen(false);
      fetchOrders();
    } catch (err) {
      toast.error((err as Error).message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = (order: PurchaseOrder): void => {
    exportApi.downloadOrder(order.id);
    toast.success('正在导出订货单...');
  };

  const columns: TableProps<PurchaseOrder>['columns'] = [
    { title: '订单号', dataIndex: 'orderNo', width: 180, fixed: 'left' },
    { title: '申请人', dataIndex: 'applicantName', width: 100 },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      width: 170,
      className: 'tnum',
      render: (val: string) => new Date(val).toLocaleString('zh-CN'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: OrderStatus) => (
        <span className={`status-badge ${status}`}>
          {ORDER_STATUS_LABELS[status]}
        </span>
      ),
    },
    {
      title: '物品种类',
      width: 100,
      render: (_: unknown, record: PurchaseOrder) => record.items?.length || 0,
    },
    {
      title: '合计金额',
      dataIndex: 'totalAmount',
      width: 120,
      className: 'tnum',
      render: (val: number) => `¥${val?.toFixed(2) || '0.00'}`,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 220,
      render: (_: unknown, record: PurchaseOrder) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/orders/${record.id}`)}
          >
            <Eye size={14} />
            详情
          </Button>
          {record.status === 'pending' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openReview(record)}
            >
              审核
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleExport(record)}
          >
            <Download size={14} />
            导出
          </Button>
        </div>
      ),
    },
  ];

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-4 rise">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-semibold">采购管理</h1>
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
        <h1 className="font-display text-xl font-semibold">采购管理</h1>
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">状态</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部状态</SelectItem>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">申请人</Label>
            <Select value={applicantId} onValueChange={setApplicantId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="全部申请人" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部申请人</SelectItem>
                {applicants.map((u: UserInfo) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}（{u.studentId}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 col-span-2">
            <Label className="text-xs text-muted-foreground">
              关键词（订单号 / 物料名）
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  className="pl-8"
                  placeholder="搜索订单号或物料名称"
                  value={keyword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setKeyword(e.target.value)
                  }
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                />
              </div>
              <Button onClick={handleSearch}>搜索</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table<PurchaseOrder>
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1100, y: 520 }}
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

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              审核订单 {reviewOrder?.orderNo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              申请人：{reviewOrder?.applicantName}
              <br />
              物品种类：{reviewOrder?.items?.length || 0} 项
              <br />
              合计金额：
              <span className="tnum">
                ¥{reviewOrder?.totalAmount?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="space-y-2">
              <Label>审核意见</Label>
              <Textarea
                value={reviewRemark}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setReviewRemark(e.target.value)
                }
                placeholder="请输入审核意见（可选）"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting}
            >
              <XCircle size={14} />
              驳回
            </Button>
            <Button onClick={handleApprove} disabled={submitting}>
              <CheckCircle size={14} />
              通过
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseAdminPage;
