import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableProps } from '@lark-apaas/client-toolkit/antd-table';
import { Search } from 'lucide-react';
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
import { Label } from '@client/src/components/ui/label';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { logsApi } from '@client/src/api';
import { LOG_ACTIONS, LOG_ACTION_LABELS } from '@shared/api.interface';
import type { OperationLog, LogAction } from '@shared/api.interface';

const TARGET_TYPES = [
  { value: 'user', label: '用户' },
  { value: 'order', label: '采购订单' },
  { value: 'inventory', label: '库存' },
];

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const [actionFilter, setActionFilter] = useState<string>('');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('');
  const [operatorName, setOperatorName] = useState('');

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params: {
      page: number;
      pageSize: number;
      action?: string;
      targetType?: string;
      operatorName?: string;
    } = { page, pageSize };
    if (actionFilter) params.action = actionFilter;
    if (targetTypeFilter) params.targetType = targetTypeFilter;
    if (operatorName.trim()) params.operatorName = operatorName.trim();

    logsApi
      .list(params)
      .then((res) => {
        setLogs(res.items);
        setTotal(res.total);
      })
      .catch((err: Error) => {
        toast.error(err.message || '加载日志失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, pageSize, actionFilter, targetTypeFilter, operatorName]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (): void => {
    setPage(1);
  };

  const columns: TableProps<OperationLog>['columns'] = [
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      width: 170,
      fixed: 'left',
      className: 'tnum',
      render: (val: string) => new Date(val).toLocaleString('zh-CN'),
      sorter: true,
      defaultSortOrder: 'descend',
    },
    { title: '操作人', dataIndex: 'operatorName', width: 120 },
    {
      title: '操作类型',
      dataIndex: 'action',
      width: 130,
      render: (val: LogAction) => LOG_ACTION_LABELS[val] || val,
    },
    { title: '目标类型', dataIndex: 'targetType', width: 120 },
    {
      title: '目标ID',
      dataIndex: 'targetId',
      width: 200,
      className: 'tnum',
      ellipsis: true,
    },
    {
      title: '详情',
      dataIndex: 'detail',
      width: 300,
      ellipsis: true,
      render: (val?: string) => val || '-',
    },
  ];

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-4 rise">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-semibold">操作日志</h1>
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
        <h1 className="font-display text-xl font-semibold">操作日志</h1>
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">操作类型</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="全部类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部类型</SelectItem>
                {LOG_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {LOG_ACTION_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">目标类型</Label>
            <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="全部目标" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部目标</SelectItem>
                {TARGET_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">操作人</Label>
            <div className="flex gap-2">
              <Input
                placeholder="输入操作人姓名"
                value={operatorName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setOperatorName(e.target.value)
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
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table<OperationLog>
          columns={columns}
          dataSource={logs}
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
    </div>
  );
};

export default LogsPage;
