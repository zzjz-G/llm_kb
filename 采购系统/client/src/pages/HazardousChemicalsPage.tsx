import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { hazchemApi } from '@client/src/api';
import type { HazardousChemical } from '@shared/api.interface';

const HazardousChemicalsPage: React.FC = () => {
  const [items, setItems] = useState<HazardousChemical[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await hazchemApi.list({
        page,
        pageSize,
        keyword: keyword || undefined,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      // Error handled by global error display
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const handleSearch = (): void => {
    setKeyword(searchInput.trim());
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleSearch();
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-foreground">
          危险化学品目录
        </h1>
        <div className="text-sm text-muted-foreground">
          共 <span className="tnum font-medium text-foreground">{total}</span> 条
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索品名、CAS号、别名..."
            value={searchInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchInput(e.target.value)
            }
            onKeyDown={handleKeyDown}
          />
        </div>
        <Button onClick={handleSearch}>搜索</Button>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium text-muted-foreground">
              <th className="px-3 py-2 w-20">目录序号</th>
              <th className="px-3 py-2 w-32">CAS号</th>
              <th className="px-3 py-2">品名</th>
              <th className="px-3 py-2 w-48">别名</th>
              <th className="px-3 py-2 w-24">备注</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="px-3 py-2">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-3 py-2">
                      <Skeleton className="h-4 w-48" />
                    </td>
                    <td className="px-3 py-2">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-3 py-2">
                      <Skeleton className="h-4 w-12" />
                    </td>
                  </tr>
                ))}
              </>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-12 text-center text-sm text-muted-foreground"
                >
                  暂无匹配数据
                </td>
              </tr>
            )}
            {!loading &&
              items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-b-0 hover:bg-primary/5"
                >
                  <td className="px-3 py-2 tnum text-muted-foreground">
                    {item.seq}
                  </td>
                  <td className="px-3 py-2 tnum">{item.cas || '-'}</td>
                  <td className="px-3 py-2 font-medium">
                    {item.names && item.names.length > 0 ? item.names[0] : '-'}
                    {item.names && item.names.length > 1 && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        等{item.names.length}个
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {item.alias || '-'}
                  </td>
                  <td className="px-3 py-2">
                    {item.note ? (
                      <span className="status-badge hazardous">{item.note}</span>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            第 <span className="tnum">{page}</span> /{' '}
            <span className="tnum">{totalPages}</span> 页
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HazardousChemicalsPage;
