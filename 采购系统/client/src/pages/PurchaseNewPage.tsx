import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Resolver } from 'react-hook-form';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Plus, Trash2, AlertTriangle, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Button } from '@client/src/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/src/components/ui/form';
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
import { Alert, AlertDescription, AlertTitle } from '@client/src/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';

import { useAuth } from '@client/src/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { purchaseApi, hazchemApi } from '@client/src/api';
import {
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
} from '@shared/api.interface';
import type {
  MaterialCategory,
  CreatePurchaseItemRequest,
  CreatePurchaseOrderRequest,
  StockCheckResult,
  PendingStoreCheckResponse,
} from '@shared/api.interface';

const numField = (min: number, msg: string) =>
  z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return 0;
    return Number(val);
  }, z.number().min(min, msg));

const optNumField = (min: number, msg: string) =>
  z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    return Number(val);
  }, z.number().min(min, msg).optional());

const itemSchema = z.object({
  category: z.enum(['chemical_reagent', 'chemical_supply', 'instrument']),
  materialName: z.string().min(1, '物料名称不能为空'),
  casNo: z.string().optional(),
  isHazardous: z.enum(['yes', 'no']).optional(),
  purity: z.string().optional(),
  specification: z.string().optional(),
  purchaseChannel: z.string().optional(),
  purchaseLink: z.string().optional(),
  applyQuantity: numField(1, '数量必须大于0'),
  estUnitPrice: optNumField(0, '单价不能为负数'),
  remark: z.string().optional(),
});

const formSchema = z.object({
  items: z.array(itemSchema).min(1, '至少需要一条物料'),
  remark: z.string().optional(),
});

type PurchaseFormData = z.infer<typeof formSchema>;

const defaultItem = (): PurchaseFormData['items'][number] => ({
  category: 'chemical_reagent',
  materialName: '',
  casNo: '',
  isHazardous: undefined,
  purity: '',
  specification: '',
  purchaseChannel: '',
  purchaseLink: '',
  applyQuantity: 1,
  estUnitPrice: 0,
  remark: '',
});

const PurchaseNewPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [pendingResult, setPendingResult] = useState<PendingStoreCheckResponse | null>(null);
  const [stockWarnings, setStockWarnings] = useState<Record<number, StockCheckResult | null>>({});
  const stockTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const hazchemTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const [hazchemResults, setHazchemResults] = useState<
    Record<
      number,
      | {
          loading: boolean;
          isHazardous: boolean;
          match?: {
            id: string;
            seq: string;
            names: string;
            alias: string;
            cas: string;
            note: string;
          };
          matchType?: 'cas' | 'name' | 'alias';
        }
      | null
    >
  >({});

  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(formSchema) as unknown as Resolver<PurchaseFormData>,
    defaultValues: {
      items: [defaultItem()],
      remark: '',
    },
    mode: 'onBlur',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const items = form.watch('items');

  const totalAmount = useMemo(() => {
    return items.reduce((sum: number, item: PurchaseFormData['items'][number]) => {
      const qty = Number(item.applyQuantity) || 0;
      const price = Number(item.estUnitPrice) || 0;
      return sum + qty * price;
    }, 0);
  }, [items]);

  useEffect(() => {
    void (async () => {
      try {
        const pending = await purchaseApi.checkPendingStore();
        if (pending.hasPending && pending.pendingOrders.length > 0) {
          setPendingResult(pending);
          setPendingDialogOpen(true);
        }
      } catch (err) {
        logger.error('检查待补填订单失败', err);
      }
    })();
  }, []);

  const checkStock = useCallback(async (index: number, materialName: string) => {
    if (!materialName.trim()) {
      setStockWarnings((prev) => ({ ...prev, [index]: null }));
      return;
    }
    try {
      const result = await purchaseApi.checkStock(materialName.trim());
      setStockWarnings((prev) => ({ ...prev, [index]: result }));
    } catch (err) {
      logger.error('库存检查失败', err);
    }
  }, []);

  const handleMaterialNameBlur = useCallback(
    (index: number, value: string) => {
      if (stockTimers.current[index]) {
        clearTimeout(stockTimers.current[index]);
      }
      stockTimers.current[index] = setTimeout(() => {
        void checkStock(index, value);
      }, 300);
    },
    [checkStock],
  );

  const triggerHazchemCheck = useCallback(
    (index: number, name: string, cas: string) => {
      if (hazchemTimers.current[index]) {
        clearTimeout(hazchemTimers.current[index]);
      }
      const trimmedName: string = name.trim();
      const trimmedCas: string = cas.trim();
      if (!trimmedName && !trimmedCas) {
        setHazchemResults((prev) => ({ ...prev, [index]: null }));
        form.setValue(`items.${index}.isHazardous`, undefined);
        return;
      }
      setHazchemResults((prev) => ({
        ...prev,
        [index]: { loading: true, isHazardous: false },
      }));
      hazchemTimers.current[index] = setTimeout(async () => {
        try {
          const result = await hazchemApi.check({
            name: trimmedName || undefined,
            cas: trimmedCas || undefined,
          });
          setHazchemResults((prev) => ({
            ...prev,
            [index]: {
              loading: false,
              isHazardous: result.isHazardous,
              match: result.match,
              matchType: result.matchType,
            },
          }));
          form.setValue(
            `items.${index}.isHazardous`,
            result.isHazardous ? 'yes' : 'no',
          );
        } catch (err) {
          logger.error('危化品自动识别失败', err);
          setHazchemResults((prev) => ({
            ...prev,
            [index]: { loading: false, isHazardous: false },
          }));
          form.setValue(`items.${index}.isHazardous`, 'no');
        }
      }, 300);
    },
    [form],
  );

  useEffect(() => {
    return () => {
      Object.values(stockTimers.current).forEach((t) => clearTimeout(t));
      Object.values(hazchemTimers.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  const handleAddItem = useCallback(() => {
    append(defaultItem());
  }, [append]);

  const handleRemoveItem = useCallback(
    (index: number) => {
      if (fields.length <= 1) return;
      remove(index);
      setStockWarnings((prev) => {
        const next: Record<number, StockCheckResult | null> = {};
        Object.keys(prev).forEach((key) => {
          const i = Number(key);
          if (i < index) next[i] = prev[i];
          else if (i > index) next[i - 1] = prev[i];
        });
        return next;
      });
      setHazchemResults((prev) => {
        if (hazchemTimers.current[index]) {
          clearTimeout(hazchemTimers.current[index]);
          delete hazchemTimers.current[index];
        }
        const next: Record<number, (typeof prev)[number]> = {};
        Object.keys(prev).forEach((key) => {
          const i = Number(key);
          if (i < index) next[i] = prev[i];
          else if (i > index) next[i - 1] = prev[i];
        });
        return next;
      });
    },
    [fields.length, remove],
  );

  const isReagent = (cat: string): boolean => cat === 'chemical_reagent';

  const validateReagentFields = useCallback((): boolean => {
    const currentItems = form.getValues('items');
    let hasError = false;
    currentItems.forEach((item: PurchaseFormData['items'][number], index: number) => {
      if (item.category === 'chemical_reagent') {
        if (!item.casNo?.trim()) {
          form.setError(`items.${index}.casNo`, { message: '化学试剂CAS号必填' });
          hasError = true;
        }
        if (!item.purity?.trim()) {
          form.setError(`items.${index}.purity`, { message: '化学试剂纯度必填' });
          hasError = true;
        }
      }
    });
    return !hasError;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    const reagentOk = validateReagentFields();
    if (!reagentOk) return;

    if (!user?.receiveName || !user?.receivePhone || !user?.receiveAddress) {
      toast.error('请先到个人中心完善收货信息');
      return;
    }

    try {
      const pending = await purchaseApi.checkPendingStore();
      if (pending.hasPending && pending.pendingOrders.length > 0) {
        setPendingResult(pending);
        setPendingDialogOpen(true);
        return;
      }
    } catch (err) {
      logger.error('检查待补填订单失败', err);
    }

    await doSubmit();
  }, [form, validateReagentFields, user]);

  const doSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const data = form.getValues();
      const request: CreatePurchaseOrderRequest = {
            items: data.items.map((item) => {
              const base: CreatePurchaseItemRequest = {
                category: item.category as MaterialCategory,
                materialName: item.materialName.trim(),
                applyQuantity: Number(item.applyQuantity),
                specification: item.specification?.trim() || undefined,
                purchaseChannel: item.purchaseChannel?.trim() || undefined,
                purchaseLink: item.purchaseLink?.trim() || undefined,
                estUnitPrice: item.estUnitPrice ? Number(item.estUnitPrice) : undefined,
                remark: item.remark?.trim() || undefined,
              };
              if (item.category === 'chemical_reagent') {
                base.casNo = item.casNo?.trim() || undefined;
                base.isHazardous = item.isHazardous ?? 'no';
                base.purity = item.purity?.trim() || undefined;
              }
              return base;
            }),
        remark: data.remark?.trim() || undefined,
      };

      const result = await purchaseApi.createOrder(request);
      toast.success('采购申请提交成功');
      navigate('/purchase/my');
      logger.info('采购申请提交成功', result.id);
    } catch (err) {
      const msg = (err as Error).message || '提交失败，请稍后重试';
      toast.error(msg);
      logger.error('采购申请提交失败', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, navigate]);

  return (
    <div className="space-y-4 rise">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="text-primary" size={22} />
          <h1 className="text-xl font-semibold font-display">采购申请</h1>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? '提交中...' : '提交申请'}
        </Button>
      </div>

      <Form {...form}>
        <form className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">订单基本信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs mb-1">订单号</div>
                  <div className="font-medium tnum">待生成</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">申请人</div>
                  <div className="font-medium">{user?.name || '—'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">预估合计金额</div>
                  <div className="font-medium tnum text-primary">¥ {totalAmount.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">收货信息</CardTitle>
              <Link
                to="/profile"
                className="text-xs text-primary hover:underline"
              >
                去个人中心修改
              </Link>
            </CardHeader>
            <CardContent>
              {user && (user.receiveName || user.receivePhone || user.receiveAddress) ? (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">联系人</div>
                    <div className="font-medium">{user.receiveName || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">联系电话</div>
                    <div className="font-medium tnum">{user.receivePhone || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">收件地址</div>
                    <div className="font-medium">{user.receiveAddress || '—'}</div>
                  </div>
                </div>
              ) : (
                <div className="rounded-md bg-amber-50 px-4 py-3 text-xs text-amber-700 border border-amber-200">
                  请先到
                  <Link to="/profile" className="font-medium underline mx-1">
                    个人中心
                  </Link>
                  完善收货信息后再提交申请。
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">物料明细</CardTitle>
              <Button variant="outline" size="sm" type="button" onClick={handleAddItem}>
                <Plus size={14} />
                添加物料
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.map((field, index) => {
        const category = items[index]?.category;
                const reagent = isReagent(category);
                const stockWarning = stockWarnings[index];
                const itemQty = Number(items[index]?.applyQuantity) || 0;
                const itemPrice = Number(items[index]?.estUnitPrice) || 0;
                const itemTotal = itemQty * itemPrice;

                return (
                  <div key={field.id} className="space-y-3 border border-border rounded-md p-4 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        物料 {index + 1}
                      </span>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 size={14} />
                          删除
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.category`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              耗材分类 <span aria-hidden="true" className="text-destructive">*</span>
                            </FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(val) => {
                                field.onChange(val);
                                if (val !== 'chemical_reagent') {
                                  form.setValue(`items.${index}.isHazardous`, undefined);
                                  setHazchemResults((prev) => ({
                                    ...prev,
                                    [index]: null,
                                  }));
                                  if (hazchemTimers.current[index]) {
                                    clearTimeout(hazchemTimers.current[index]);
                                  }
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="请选择分类" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {MATERIAL_CATEGORIES.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {MATERIAL_CATEGORY_LABELS[cat]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.materialName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              物料名称 <span aria-hidden="true" className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="请输入物料名称"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  triggerHazchemCheck(
                                    index,
                                    e.target.value,
                                    items[index]?.casNo || '',
                                  );
                                }}
                                onBlur={(e) => {
                                  field.onBlur();
                                  handleMaterialNameBlur(index, e.target.value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.casNo`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              CAS号
                              {reagent && (
                                <span aria-hidden="true" className="text-destructive"> *</span>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={reagent ? '请输入CAS号' : '选填'}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  triggerHazchemCheck(
                                    index,
                                    items[index]?.materialName || '',
                                    e.target.value,
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">是否危化品</div>
                        <div className="min-h-9 flex items-start pt-1">
                          {!items[index]?.materialName?.trim() &&
                          !items[index]?.casNo?.trim() ? (
                            <span className="text-xs text-muted-foreground">
                              待输入名称或CAS号
                            </span>
                          ) : hazchemResults[index]?.loading ? (
                            <span className="text-xs text-muted-foreground">识别中...</span>
                          ) : hazchemResults[index]?.isHazardous ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant="destructive">是（危险化学品）</Badge>
                              {hazchemResults[index]?.match && (
                                <div className="text-[11px] text-muted-foreground leading-tight">
                                  {hazchemResults[index].match.names && (
                                    <div>品名：{hazchemResults[index].match.names}</div>
                                  )}
                                  {hazchemResults[index].match.cas && (
                                    <div>CAS：{hazchemResults[index].match.cas}</div>
                                  )}
                                  {hazchemResults[index].match.seq && (
                                    <div>
                                      目录序号：{hazchemResults[index].match.seq}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : hazchemResults[index] && !hazchemResults[index].loading ? (
                            <Badge
                              variant="outline"
                              className="border-green-500 bg-green-50 text-green-600 hover:bg-green-50"
                            >
                              否
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {stockWarning?.hasStock && stockWarning.stockItems.length > 0 && (
                      <Alert variant="warning" className="py-2">
                        <AlertTriangle size={16} />
                        <AlertTitle className="text-xs font-medium">库存预警</AlertTitle>
                        <AlertDescription className="text-xs">
                          该物料已有库存{' '}
                          <span className="font-medium tnum">
                            {stockWarning.stockItems.reduce(
                              (s: number, it) => s + it.remainingQuantity,
                              0,
                            )}
                          </span>{' '}
                          件，是否确认继续采购？
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-4 gap-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.purity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              纯度
                              {reagent && (
                                <span aria-hidden="true" className="text-destructive"> *</span>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input placeholder={reagent ? '请输入纯度' : '选填'} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.specification`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">规格型号</FormLabel>
                            <FormControl>
                              <Input placeholder="选填" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.purchaseChannel`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">采购渠道</FormLabel>
                            <FormControl>
                              <Input placeholder="选填" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.purchaseLink`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">采购链接</FormLabel>
                            <FormControl>
                              <Input placeholder="选填" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.applyQuantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              申请数量 <span aria-hidden="true" className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input type="number" min={1} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.estUnitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">预估单价（元）</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">预估总价</div>
                        <div className="h-9 flex items-center px-3 rounded-md border border-border bg-muted/30 text-sm font-medium tnum">
                          ¥ {itemTotal.toFixed(2)}
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name={`items.${index}.remark`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">备注</FormLabel>
                            <FormControl>
                              <Input placeholder="选填" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                );
              })}

              <Button variant="outline" type="button" onClick={handleAddItem} className="w-full">
                <Plus size={14} />
                添加物料
              </Button>
            </CardContent>
          </Card>
        </form>
      </Form>

      <Dialog open={pendingDialogOpen} onOpenChange={setPendingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-warning-foreground" size={18} />
              有待补填的入库单
            </DialogTitle>
            <DialogDescription>
              您有以下已入库但未补填存放位置的订单，请先完成补填后再提交新采购申请。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-auto">
            {pendingResult?.pendingOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <div className="font-medium tnum">{order.orderNo}</div>
                  <div className="text-xs text-muted-foreground">
                    共 {order.itemCount} 种物料待补填
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  去补填
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDialogOpen(false)}>
              我知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseNewPage;
