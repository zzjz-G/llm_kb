import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, type TableProps } from '@lark-apaas/client-toolkit/antd-table';
import { ArrowLeft, Trash2, Check, X, PackageOpen, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { Textarea } from '@client/src/components/ui/textarea';

import { useAuth } from '@client/src/contexts/AuthContext';
import { purchaseApi } from '@client/src/api';
import {
  MATERIAL_CATEGORY_LABELS,
  HAZARDOUS_LABELS,
  ORDER_STATUS_LABELS,
} from '@shared/api.interface';
import type {
  PurchaseOrder,
  PurchaseItem,
  MaterialCategory,
  HazardousOption,
  StoreItemRequest,
  CompleteItemRequest,
  OrderStatus,
} from '@shared/api.interface';

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectRemark, setRejectRemark] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [storeItems, setStoreItems] = useState<
    { itemId: string; materialName: string; storageLocation: string; remainingQuantity: number; inUnitPrice: number }[]
  >([]);
  const [isSubmittingStore, setIsSubmittingStore] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await purchaseApi.getOrder(id);
      setOrder(result);
    } catch (err) {
      const msg = (err as Error).message || '加载失败';
      toast.error(msg);
      logger.error('加载订单详情失败', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchOrder();
  }, [fetchOrder]);

  const handleDelete = useCallback(async () => {
    if (!order) return;
    setIsDeleting(true);
    try {
      await purchaseApi.deleteOrder(order.id);
      toast.success('删除成功');
      navigate('/purchase/my');
    } catch (err) {
      const msg = (err as Error).message || '删除失败';
      toast.error(msg);
      logger.error('删除订单失败', err);
    } finally {
      setIsDeleting(false);
    }
  }, [order, navigate]);

  const handleApprove = useCallback(async () => {
    if (!order) return;
    try {
      await purchaseApi.approve(order.id);
      toast.success('审核通过');
      void fetchOrder();
    } catch (err) {
      const msg = (err as Error).message || '操作失败';
      toast.error(msg);
      logger.error('审核通过失败', err);
    }
  }, [order, fetchOrder]);

  const handleReject = useCallback(async () => {
    if (!order || !rejectRemark.trim()) {
      toast.error('请填写驳回原因');
      return;
    }
    setIsRejecting(true);
    try {
      await purchaseApi.reject(order.id, rejectRemark.trim());
      toast.success('已驳回');
      setRejectDialogOpen(false);
      setRejectRemark('');
      void fetchOrder();
    } catch (err) {
      const msg = (err as Error).message || '操作失败';
      toast.error(msg);
      logger.error('审核驳回失败', err);
    } finally {
      setIsRejecting(false);
    }
  }, [order, rejectRemark, fetchOrder]);

  const openStoreDialog = useCallback(() => {
    if (!order) return;
    setStoreItems(
      order.items.map((item: PurchaseItem) => ({
        itemId: item.id,
        materialName: item.materialName,
        storageLocation: item.storageLocation || '',
        remainingQuantity: item.remainingQuantity ?? item.applyQuantity,
        inUnitPrice: item.estUnitPrice || 0,
      })),
    );
    setStoreDialogOpen(true);
  }, [order]);

  const openCompleteDialog = useCallback(() => {
    if (!order) return;
    setStoreItems(
      order.items.map((item: PurchaseItem) => ({
        itemId: item.id,
        materialName: item.materialName,
        storageLocation: item.storageLocation || '',
        remainingQuantity: item.remainingQuantity ?? item.applyQuantity,
        inUnitPrice: 0,
      })),
    );
    setCompleteDialogOpen(true);
  }, [order]);

  const handleStoreSubmit = useCallback(async () => {
    if (!order) return;
    const invalid = storeItems.some(
      (it) => !it.storageLocation.trim() || it.remainingQuantity < 0,
    );
    if (invalid) {
      toast.error('请填写完整的存放位置和剩余数量');
      return;
    }
    setIsSubmittingStore(true);
    try {
      const items = storeItems.map((it) => ({
        itemId: it.itemId,
        storageLocation: it.storageLocation.trim(),
        remainingQuantity: Number(it.remainingQuantity),
        inUnitPrice: Number(it.inUnitPrice),
      }));
      await purchaseApi.storeOrder(order.id, items);
      toast.success('登记入库成功');
      setStoreDialogOpen(false);
      void fetchOrder();
    } catch (err) {
      const msg = (err as Error).message || '操作失败';
      toast.error(msg);
      logger.error('登记入库失败', err);
    } finally {
      setIsSubmittingStore(false);
    }
  }, [order, storeItems, fetchOrder]);

  const handleCompleteSubmit = useCallback(async () => {
    if (!order) return;
    const invalid = storeItems.some(
      (it) => !it.storageLocation.trim() || it.remainingQuantity < 0,
    );
    if (invalid) {
      toast.error('请填写完整的存放位置和剩余数量');
      return;
    }
    setIsSubmittingStore(true);
    try {
      const items: CompleteItemRequest[] = storeItems.map((it) => ({
        itemId: it.itemId,
        storageLocation: it.storageLocation.trim(),
        remainingQuantity: Number(it.remainingQuantity),
      }));
      await purchaseApi.completeOrder(order.id, items);
      toast.success('补填完成');
      setCompleteDialogOpen(false);
      void fetchOrder();
    } catch (err) {
      const msg = (err as Error).message || '操作失败';
      toast.error(msg);
      logger.error('补填失败', err);
    } finally {
      setIsSubmittingStore(false);
    }
  }, [order, storeItems, fetchOrder]);

  const updateStoreItem = useCallback(
    (idx: number, field: string, value: string | number) => {
      setStoreItems((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: value };
        return next;
      });
    },
    [],
  );

  const status = order?.status;

  const baseColumns: TableProps<PurchaseItem>['columns'] = [
    { title: '序号', key: 'idx', width: 60, render: (_: unknown, __: PurchaseItem, index: number) => index + 1 },
    {
      title: '耗材分类',
      dataIndex: 'category',
      width: 100,
      render: (val: MaterialCategory) => MATERIAL_CATEGORY_LABELS[val],
    },
    { title: '物料名称', dataIndex: 'materialName', width: 160 },
    { title: 'CAS号', dataIndex: 'casNo', width: 120, render: (val?: string) => val || '—' },
    {
      title: '是否危化品',
      dataIndex: 'isHazardous',
      width: 100,
      render: (val?: HazardousOption) => {
        if (!val) return '—';
        return (
          <span className={`status-badge ${val === 'yes' ? 'hazardous' : ''}`}>
            {HAZARDOUS_LABELS[val]}
          </span>
        );
      },
    },
    { title: '纯度', dataIndex: 'purity', width: 100, render: (val?: string) => val || '—' },
    { title: '规格型号', dataIndex: 'specification', width: 120, render: (val?: string) => val || '—' },
    { title: '申请数量', dataIndex: 'applyQuantity', width: 100, className: 'tnum' },
  ];

  const priceColumns: TableProps<PurchaseItem>['columns'] = [
    {
      title: '预估单价',
      dataIndex: 'estUnitPrice',
      width: 100,
      className: 'tnum',
      render: (val?: number) => (val !== undefined ? `¥ ${val.toFixed(2)}` : '—'),
    },
    {
      title: '预估总价',
      dataIndex: 'estTotalPrice',
      width: 120,
      className: 'tnum',
      render: (val?: number) => (val !== undefined ? `¥ ${val.toFixed(2)}` : '—'),
    },
  ];

  const columns = isStudent ? baseColumns : [...baseColumns, ...priceColumns];

  columns.push({
    title: '备注',
    dataIndex: 'remark',
    render: (val?: string) => val || '—',
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          返回
        </Button>
        <div className="text-center py-12 text-muted-foreground">订单不存在</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rise">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          返回
        </Button>
        <h1 className="text-xl font-semibold font-display">订单详情</h1>
        <span className={`status-badge ${order.status}`}>
          {ORDER_STATUS_LABELS[order.status as OrderStatus]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">订单基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">订单号</span>
              <span className="font-medium tnum">{order.orderNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">申请人</span>
              <span>{order.applicantName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">申请时间</span>
              <span className="tnum">{new Date(order.createdAt).toLocaleString('zh-CN')}</span>
            </div>
            {!isStudent && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">预估合计</span>
                <span className="font-medium tnum text-primary">
                  ¥ {(order.totalAmount || 0).toFixed(2)}
                </span>
              </div>
            )}
            {order.reviewRemark && (
              <div className="pt-2 border-t border-border">
                <div className="text-muted-foreground mb-1">审核意见</div>
                <div className="text-sm">{order.reviewRemark}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">收货信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">收货姓名</span>
              <span>{order.receiveName || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">手机号</span>
              <span className="tnum">{order.receivePhone || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">地址</span>
              <div className="mt-1">{order.receiveAddress || '—'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            物料明细（共 {order.items.length} 种）
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            columns={columns}
            dataSource={order.items}
            rowKey="id"
            pagination={false}
            scroll={{ x: isStudent ? 1100 : 1400, y: 400 }}
          />
        </CardContent>
      </Card>

      {/* 操作区 */}
      <div className="flex justify-end gap-2">
        {isStudent && status === 'pending' && (
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 size={16} />
            删除订单
          </Button>
        )}
        {isStudent && status === 'stored' && (
          <Button onClick={openCompleteDialog}>
            <ClipboardCheck size={16} />
            补填存放位置
          </Button>
        )}
        {isAdmin && status === 'pending' && (
          <>
            <Button variant="destructive" onClick={() => setRejectDialogOpen(true)}>
              <X size={16} />
              驳回
            </Button>
            <Button onClick={handleApprove}>
              <Check size={16} />
              通过
            </Button>
          </>
        )}
        {isAdmin && status === 'approved' && (
          <Button onClick={openStoreDialog}>
            <PackageOpen size={16} />
            登记入库
          </Button>
        )}
      </div>

      {/* 删除对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除订单 <span className="font-medium tnum">{order.orderNo}</span> 吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 驳回对话框 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>驳回订单</DialogTitle>
            <DialogDescription>请填写驳回原因，以便申请人了解</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="请输入驳回原因"
            value={rejectRemark}
            onChange={(e) => setRejectRemark(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={isRejecting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isRejecting}>
              {isRejecting ? '提交中...' : '确认驳回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 入库对话框 */}
      <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>登记入库</DialogTitle>
            <DialogDescription>请填写每种物料的存放位置、剩余数量和实际入库单价</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-auto">
            {storeItems.map((item, idx) => (
              <div key={item.itemId} className="border border-border rounded-md p-3 space-y-2">
                <div className="text-sm font-medium">{idx + 1}. {item.materialName}</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      存放位置 <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={item.storageLocation}
                      onChange={(e) => updateStoreItem(idx, 'storageLocation', e.target.value)}
                      placeholder="如：A柜-2层"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      剩余数量 <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="number"
                      value={item.remainingQuantity}
                      onChange={(e) => updateStoreItem(idx, 'remainingQuantity', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      入库单价（元）
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.inUnitPrice}
                      onChange={(e) => updateStoreItem(idx, 'inUnitPrice', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStoreDialogOpen(false)} disabled={isSubmittingStore}>
              取消
            </Button>
            <Button onClick={handleStoreSubmit} disabled={isSubmittingStore}>
              {isSubmittingStore ? '提交中...' : '确认入库'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 补填对话框 */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>补填存放位置</DialogTitle>
            <DialogDescription>请填写每种物料的存放位置和剩余数量</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-auto">
            {storeItems.map((item, idx) => (
              <div key={item.itemId} className="border border-border rounded-md p-3 space-y-2">
                <div className="text-sm font-medium">{idx + 1}. {item.materialName}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      存放位置 <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={item.storageLocation}
                      onChange={(e) => updateStoreItem(idx, 'storageLocation', e.target.value)}
                      placeholder="如：A柜-2层"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      剩余数量 <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="number"
                      value={item.remainingQuantity}
                      onChange={(e) => updateStoreItem(idx, 'remainingQuantity', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)} disabled={isSubmittingStore}>
              取消
            </Button>
            <Button onClick={handleCompleteSubmit} disabled={isSubmittingStore}>
              {isSubmittingStore ? '提交中...' : '提交'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDetailPage;
