import React from 'react';
import { logger } from '@client/src/lib/logger';
import { Button } from '@client/src/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('React ErrorBoundary caught an error', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-base">页面加载出错</h3>
                <p className="text-xs text-muted-foreground">
                  组件渲染时发生异常，已自动隔离以避免影响其他功能
                </p>
              </div>
            </div>
            <div className="rounded-md bg-muted p-3 mb-4">
              <p className="text-xs font-mono text-muted-foreground break-words">
                {this.state.error?.message || '未知错误'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={this.handleReset}>
                重试
              </Button>
              <Button size="sm" variant="outline" onClick={this.handleReload}>
                刷新页面
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
