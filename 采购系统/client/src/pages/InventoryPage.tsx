import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, type TableProps } from '@client/src/components/ui/antd-table';
import * as XLSX from 'xlsx';
import { Search, Plus, Download, Pencil, Trash2, PackageMinus, Upload, FileDown, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@client/src/lib/logger';
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
import { Textarea } from '@client/src/components/ui/textarea';
import { Label } from '@client/src/components/ui/label';
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
import { inventoryApi, exportApi, hazchemApi } from '@client/src/api';
import { useAuth } from '@client/src/contexts/AuthContext';
import {
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
  HAZARDOUS_OPTIONS,
  HAZARDOUS_LABELS,
} from '@shared/api.interface';
import type {
  InventoryItem,
  MaterialCategory,
  HazardousOption,
  CreateInventoryRequest,
  UpdateInventoryRequest,
  InventoryImportResult,
  InventoryImportRowError,
} from '@shared/api.interface';

interface InventoryFormData {
  materialName: string;
  category: MaterialCategory;
  specification: string;
  casNo: string;
  isHazardous: HazardousOption;
  purity: string;
  purchaseChannel: string;
  purchaseLink: string;
  applicant: string;
  inQuantity: string;
  inUnitPrice: string;
  storageLocation: string;
  remark: string;
}

const emptyForm: InventoryFormData = {
  materialName: '',
  category: 'chemical_reagent',
  specification: '',
  casNo: '',
  isHazardous: 'no',
  purity: '',
  purchaseChannel: '',
  purchaseLink: '',
  applicant: '',
  inQuantity: '',
  inUnitPrice: '',
  storageLocation: '',
  remark: '',
};

const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [storageLocation, setStorageLocation] = useState('');

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<InventoryFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [hazCheckLoading, setHazCheckLoading] = useState(false);
  const [hazCheckResult, setHazCheckResult] = useState<{
    isHazardous: boolean;
    matchType?: string;
    matchName?: string;
  } | null>(null);
  const [isHazardousManual, setIsHazardousManual] = useState(false);

  const [consumeDialogOpen, setConsumeDialogOpen] = useState(false);
  const [consumeItem, setConsumeItem] = useState<InventoryItem | null>(null);
  const [consumeQuantity, setConsumeQuantity] = useState('');
  const [consumeRemark, setConsumeRemark] = useState('');
  const [consumeSubmitting, setConsumeSubmitting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importPreviewRows, setImportPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [importResult, setImportResult] = useState<InventoryImportResult | null>(null);
  const [importSubmitting, setImportSubmitting] = useState(false);

  const fetchItems = useCallback(() => {
    setLoading(true);
    const params: {
      page: number;
      pageSize: number;
      keyword?: string;
      category?: string;
      storageLocation?: string;
    } = { page, pageSize };
    if (keyword.trim()) params.keyword = keyword.trim();
    if (categoryFilter) params.category = categoryFilter;
    if (storageLocation.trim()) params.storageLocation = storageLocation.trim();

    inventoryApi
      .list(params)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err: Error) => {
        toast.error(err.message || '加载库存列表失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, pageSize, keyword, categoryFilter, storageLocation]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSearch = (): void => {
    setPage(1);
  };

  const openCreate = (): void => {
    setEditingItem(null);
    setFormData(emptyForm);
    setHazCheckResult(null);
    setIsHazardousManual(false);
    setFormDialogOpen(true);
  };

  const openEdit = (item: InventoryItem): void => {
    setEditingItem(item);
    setFormData({
      materialName: item.materialName,
      category: item.category,
      specification: item.specification || '',
      casNo: item.casNo || '',
      isHazardous: item.isHazardous || 'no',
      purity: item.purity || '',
      purchaseChannel: item.purchaseChannel || '',
      purchaseLink: item.purchaseLink || '',
      applicant: item.applicant || '',
      inQuantity: String(item.inQuantity),
      inUnitPrice: item.inUnitPrice ? String(item.inUnitPrice) : '',
      storageLocation: item.storageLocation || '',
      remark: item.remark || '',
    });
    setHazCheckResult(null);
    setIsHazardousManual(true);
    setFormDialogOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formData.materialName.trim()) {
      toast.error('请输入物料名称');
      return false;
    }
    if (!formData.inQuantity || Number(formData.inQuantity) <= 0) {
      toast.error('请输入有效的入库数量');
      return false;
    }
    return true;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const inQty = Number(formData.inQuantity);
      const unitPrice = formData.inUnitPrice ? Number(formData.inUnitPrice) : undefined;
      const baseData: CreateInventoryRequest = {
        materialName: formData.materialName.trim(),
        category: formData.category,
        specification: formData.specification.trim() || undefined,
        casNo: formData.casNo.trim() || undefined,
        isHazardous: formData.isHazardous,
        purity: formData.purity.trim() || undefined,
        purchaseChannel: formData.purchaseChannel.trim() || undefined,
        purchaseLink: formData.purchaseLink.trim() || undefined,
        applicant: formData.applicant.trim() || undefined,
        inQuantity: inQty,
        inUnitPrice: unitPrice,
        inTotalPrice: unitPrice ? unitPrice * inQty : undefined,
        storageLocation: formData.storageLocation.trim() || undefined,
        remark: formData.remark.trim() || undefined,
      };

      if (editingItem) {
        await inventoryApi.update(editingItem.id, baseData as UpdateInventoryRequest);
        toast.success('库存信息已更新');
      } else {
        await inventoryApi.create(baseData);
        toast.success('库存已新增');
      }
      setFormDialogOpen(false);
      fetchItems();
    } catch (err) {
      toast.error((err as Error).message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openConsume = (item: InventoryItem): void => {
    setConsumeItem(item);
    setConsumeQuantity('');
    setConsumeRemark('');
    setConsumeDialogOpen(true);
  };

  const handleConsume = async (): Promise<void> => {
    if (!consumeItem) return;
    const qty = Number(consumeQuantity);
    if (!qty || qty <= 0) {
      toast.error('请输入有效的消耗数量');
      return;
    }
    if (qty > consumeItem.remainingQuantity) {
      toast.error('消耗数量不能大于剩余数量');
      return;
    }
    setConsumeSubmitting(true);
    try {
      await inventoryApi.consume(consumeItem.id, {
        quantity: qty,
        remark: consumeRemark || undefined,
      });
      toast.success('领用消耗已登记');
      setConsumeDialogOpen(false);
      fetchItems();
    } catch (err) {
      toast.error((err as Error).message || '操作失败');
    } finally {
      setConsumeSubmitting(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteItem) return;
    try {
      await inventoryApi.remove(deleteItem.id);
      toast.success('已删除');
      setDeleteDialogOpen(false);
      fetchItems();
    } catch (err) {
      toast.error((err as Error).message || '删除失败');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      toast.error('请上传 .xlsx 或 .xls 格式的文件');
      e.target.value = '';
      return;
    }

    setImportFileName(file.name);
    setImportResult(null);
    setImportPreviewRows([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        if (!data) {
          toast.error('文件读取失败');
          return;
        }
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, unknown>[];

        if (jsonData.length === 0) {
          toast.error('文件内容为空');
          return;
        }

        setImportPreviewRows(jsonData);
      } catch (err) {
        toast.error('文件解析失败，请检查文件格式');
        logger.error('导入文件解析失败', err);
      }
    };
    reader.onerror = () => {
      toast.error('文件读取失败');
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImportSubmit = async (): Promise<void> => {
    if (importPreviewRows.length === 0) return;
    setImportSubmitting(true);
    try {
      const result = await inventoryApi.batchImport(importPreviewRows);
      setImportResult(result);
      if (result.successCount > 0) {
        toast.success(`成功导入 ${result.successCount} 条`);
        fetchItems();
      }
      if (result.failCount > 0) {
        toast.error(`${result.failCount} 条数据校验失败，请查看详情`);
      }
    } catch (err) {
      toast.error((err as Error).message || '导入失败');
    } finally {
      setImportSubmitting(false);
    }
  };

  const closeImportDialog = (): void => {
    setImportDialogOpen(false);
    setImportFileName('');
    setImportPreviewRows([]);
    setImportResult(null);
  };

  useEffect(() => {
    if (!formDialogOpen || isHazardousManual) return;

    const name = formData.materialName.trim();
    const cas = formData.casNo.trim();
    if (!name && !cas) {
      setHazCheckResult(null);
      return;
    }

    setHazCheckLoading(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const result = await hazchemApi.check({ name: name || undefined, cas: cas || undefined });
          setHazCheckResult({
            isHazardous: result.isHazardous,
            matchType: result.matchType,
            matchName: result.match?.names?.[0],
          });
          setFormData((prev) => ({
            ...prev,
            isHazardous: result.isHazardous ? 'yes' : 'no',
          }));
        } catch {
          setHazCheckResult(null);
        } finally {
          setHazCheckLoading(false);
        }
      })();
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.materialName, formData.casNo, formDialogOpen, isHazardousManual]);

  const updateForm = (field: keyof InventoryFormData, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const computedTotalPrice = useMemo(() => {
    const qty = Number(formData.inQuantity);
    const price = Number(formData.inUnitPrice);
    if (!qty || !price) return '';
    return (qty * price).toFixed(2);
  }, [formData.inQuantity, formData.inUnitPrice]);

  const baseColumns: TableProps<InventoryItem>['columns'] = [
    { title: '物料名称', dataIndex: 'materialName', width: 160, fixed: 'left' },
    {
      title: '分类',
      dataIndex: 'category',
      width: 100,
      render: (val: MaterialCategory) => MATERIAL_CATEGORY_LABELS[val] || val,
    },
    { title: '规格', dataIndex: 'specification', width: 120 },
    { title: 'CAS号', dataIndex: 'casNo', width: 130, className: 'tnum' },
    {
      title: '是否危化品',
      dataIndex: 'isHazardous',
      width: 110,
      render: (val?: HazardousOption) =>
        val === 'yes' ? (
          <span className="status-badge hazardous">是</span>
        ) : (
          <span className="status-badge">否</span>
        ),
    },
    { title: '纯度', dataIndex: 'purity', width: 80 },
    { title: '剩余数量', dataIndex: 'remainingQuantity', width: 100, className: 'tnum' },
    { title: '存放位置', dataIndex: 'storageLocation', width: 140 },
  ];

  const studentColumns: TableProps<InventoryItem>['columns'] = [
    ...baseColumns,
    { title: '备注', dataIndex: 'remark', width: 160, ellipsis: true },
  ];

  const adminColumns: TableProps<InventoryItem>['columns'] = [
    ...baseColumns,
    {
      title: '入库时间',
      dataIndex: 'inTime',
      width: 170,
      className: 'tnum',
      render: (val: string) => new Date(val).toLocaleString('zh-CN'),
    },
    { title: '入库数量', dataIndex: 'inQuantity', width: 100, className: 'tnum' },
    {
      title: '入库单价',
      dataIndex: 'inUnitPrice',
      width: 100,
      className: 'tnum',
      render: (val?: number) => (val != null ? `¥${val.toFixed(2)}` : '-'),
    },
    {
      title: '入库总价',
      dataIndex: 'inTotalPrice',
      width: 110,
      className: 'tnum',
      render: (val?: number) => (val != null ? `¥${val.toFixed(2)}` : '-'),
    },
    { title: '申请人', dataIndex: 'applicant', width: 100 },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 220,
      render: (_: unknown, record: InventoryItem) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(record)}>
            <Pencil size={14} />
            编辑
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openConsume(record)}>
            <PackageMinus size={14} />
            领用
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => {
              setDeleteItem(record);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 size={14} />
            删除
          </Button>
        </div>
      ),
    },
  ];

  const columns = isAdmin ? adminColumns : studentColumns;
  const scrollX = isAdmin ? 1800 : 1100;

  if (loading && items.length === 0) {
    return (
      <div className="space-y-4 rise">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-semibold">库存台账</h1>
        </div>
        <div className="rounded-md border bg-card p-4">
          <div className="grid grid-cols-3 gap-3">
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
        <h1 className="font-display text-xl font-semibold">库存台账</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportApi.downloadInventory()}>
              <Download size={14} />
              导出库存台账
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload size={14} />
              导入
            </Button>
            <Button onClick={openCreate}>
              <Plus size={14} />
              新增库存
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">关键词</Label>
            <div className="flex gap-2">
              <Input
                placeholder="物料名称 / CAS号 / 存放位置 / 申请人"
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
            <Label className="text-xs text-muted-foreground">耗材分类</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="全部分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部分类</SelectItem>
                {MATERIAL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {MATERIAL_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">存放位置</Label>
            <Input
              placeholder="输入存放位置筛选"
              value={storageLocation}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setStorageLocation(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table<InventoryItem>
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={loading}
          scroll={{ x: scrollX, y: 520 }}
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

      {/* 新增/编辑库存对话框 */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? '编辑库存' : '新增库存（手动建库）'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>
                物料名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.materialName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateForm('materialName', e.target.value)
                }
                placeholder="请输入物料名称"
              />
            </div>
            <div className="space-y-1">
              <Label>
                分类 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(v: string) => updateForm('category', v as MaterialCategory)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {MATERIAL_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>规格型号</Label>
              <Input
                value={formData.specification}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateForm('specification', e.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <Label>CAS号</Label>
              <Input
                value={formData.casNo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateForm('casNo', e.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>是否危化品</Label>
                {hazCheckLoading && (
                  <span className="text-xs text-muted-foreground">识别中...</span>
                )}
                {!hazCheckLoading && hazCheckResult && !isHazardousManual && (
                  <span className="text-xs text-muted-foreground">
                    系统自动识别：
                    <span
                      className={
                        hazCheckResult.isHazardous
                          ? 'font-medium text-status-rejected'
                          : 'font-medium text-status-approved'
                      }
                    >
                      {hazCheckResult.isHazardous ? '是' : '否'}
                    </span>
                  </span>
                )}
                {!hazCheckLoading && hazCheckResult && isHazardousManual && (
                  <span className="text-xs text-muted-foreground">
                    已手动设置
                  </span>
                )}
              </div>
              <Select
                value={formData.isHazardous}
                onValueChange={(v: string) => {
                  updateForm('isHazardous', v as HazardousOption);
                  setIsHazardousManual(true);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HAZARDOUS_OPTIONS.map((h) => (
                    <SelectItem key={h} value={h}>
                      {HAZARDOUS_LABELS[h]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hazCheckResult?.isHazardous && hazCheckResult.matchName && (
                <p className="text-xs text-status-rejected">
                  匹配条目：{hazCheckResult.matchName}
                  {hazCheckResult.matchType && `（${hazCheckResult.matchType === 'cas' ? 'CAS号' : hazCheckResult.matchType === 'name' ? '品名' : '别名'}匹配）`}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>纯度</Label>
              <Input
                value={formData.purity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateForm('purity', e.target.value)
                }
                placeholder="如 99.9%"
              />
            </div>
            <div className="space-y-1">
              <Label>采购渠道</Label>
              <Input
                value={formData.purchaseChannel}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateForm('purchaseChannel', e.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <Label>采购链接</Label>
              <Input
                value={formData.purchaseLink}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateForm('purchaseLink', e.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <Label>申请人</Label>
              <Input
                value={formData.applicant}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateForm('applicant', e.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <Label>
                入库数量 <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                value={formData.inQuantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateForm('inQuantity', e.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <Label>入库单价</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.inUnitPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateForm('inUnitPrice', e.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <Label>入库总价（自动计算）</Label>
              <Input value={computedTotalPrice} disabled />
            </div>
            <div className="space-y-1">
              <Label>存放位置</Label>
              <Input
                value={formData.storageLocation}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateForm('storageLocation', e.target.value)
                }
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>备注</Label>
              <Textarea
                value={formData.remark}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  updateForm('remark', e.target.value)
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={submitting}>
                取消
              </Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={submitting}>
              {editingItem ? '保存修改' : '新增库存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 领用消耗对话框 */}
      <Dialog open={consumeDialogOpen} onOpenChange={setConsumeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>领用消耗</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              物料：{consumeItem?.materialName}
              <br />
              剩余数量：
              <span className="tnum">{consumeItem?.remainingQuantity}</span>
            </div>
            <div className="space-y-1">
              <Label>
                消耗数量 <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                value={consumeQuantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConsumeQuantity(e.target.value)
                }
                placeholder="请输入消耗数量"
              />
            </div>
            <div className="space-y-1">
              <Label>备注</Label>
              <Textarea
                value={consumeRemark}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setConsumeRemark(e.target.value)
                }
                placeholder="领用人、用途等"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={consumeSubmitting}>
                取消
              </Button>
            </DialogClose>
            <Button onClick={handleConsume} disabled={consumeSubmitting}>
              确认领用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => { if (!open) closeImportDialog(); else setImportDialogOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>批量导入库存</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
              <div className="text-sm text-muted-foreground">
                导入文件格式需与"库存存档总表"导出列一致，支持 .xlsx / .xls
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => inventoryApi.downloadTemplate()}
              >
                <FileDown size={14} />
                下载导入模板
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">选择文件</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportFile}
                  className="file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground"
                />
              </div>
              {importFileName && (
                <p className="text-xs text-muted-foreground">已选择：{importFileName}</p>
              )}
            </div>

            {importPreviewRows.length > 0 && !importResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    解析完成，共 {importPreviewRows.length} 行数据
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    点击"开始导入"后将逐行校验并写入
                  </span>
                </div>
                <div className="max-h-60 overflow-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium">行号</th>
                        <th className="px-2 py-1.5 text-left font-medium">物料名称</th>
                        <th className="px-2 py-1.5 text-left font-medium">耗材分类</th>
                        <th className="px-2 py-1.5 text-left font-medium">规格型号</th>
                        <th className="px-2 py-1.5 text-left font-medium">入库数量</th>
                        <th className="px-2 py-1.5 text-left font-medium">剩余数量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreviewRows.slice(0, 20).map((row, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1.5 tnum">{i + 2}</td>
                          <td className="px-2 py-1.5 truncate max-w-[120px]" title={String(row['物料名称'] ?? '')}>{String(row['物料名称'] ?? '')}</td>
                          <td className="px-2 py-1.5">{String(row['耗材分类'] ?? '')}</td>
                          <td className="px-2 py-1.5 truncate max-w-[100px]" title={String(row['规格型号'] ?? '')}>{String(row['规格型号'] ?? '')}</td>
                          <td className="px-2 py-1.5 tnum">{String(row['入库数量'] ?? '')}</td>
                          <td className="px-2 py-1.5 tnum">{String(row['当前剩余库存数量'] ?? '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importPreviewRows.length > 20 && (
                    <p className="px-2 py-1.5 text-center text-xs text-muted-foreground">
                      仅展示前 20 行，共 {importPreviewRows.length} 行
                    </p>
                  )}
                </div>
              </div>
            )}

            {importResult && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-sm">成功：<span className="font-medium tnum">{importResult.successCount}</span> 条</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-destructive" />
                    <span className="text-sm">失败：<span className="font-medium tnum">{importResult.failCount}</span> 条</span>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-destructive">错误详情：</p>
                    <div className="max-h-40 overflow-auto rounded-md bg-muted/50">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted text-muted-foreground">
                          <tr>
                            <th className="px-2 py-1 text-left font-medium">行号</th>
                            <th className="px-2 py-1 text-left font-medium">字段</th>
                            <th className="px-2 py-1 text-left font-medium">错误原因</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importResult.errors.map((err: InventoryImportRowError, i: number) => (
                            <tr key={i} className="border-t">
                              <td className="px-2 py-1 tnum">{err.row}</td>
                              <td className="px-2 py-1">{err.field}</td>
                              <td className="px-2 py-1 text-destructive">{err.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">{importResult ? '关闭' : '取消'}</Button>
            </DialogClose>
            {!importResult && (
              <Button
                onClick={handleImportSubmit}
                disabled={importPreviewRows.length === 0 || importSubmitting}
              >
                {importSubmitting ? '导入中...' : `开始导入 (${importPreviewRows.length} 条)`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{deleteItem?.materialName}」的库存记录吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InventoryPage;
