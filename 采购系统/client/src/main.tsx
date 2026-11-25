import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from '@client/src/components/ui/sonner';

import RoutesComponent from './app.tsx';
import './index.css';

const CLIENT_BASE_PATH = (import.meta as any).env.CLIENT_BASE_PATH || '/';

const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
    <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center">
      <h2 className="mb-2 text-lg font-semibold">页面出错了</h2>
      <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        重试
      </button>
    </div>
  </div>
);

const MainApp = () => {
  return (
    <BrowserRouter basename={CLIENT_BASE_PATH}>
      <div className="app-container min-h-screen bg-background">
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <RoutesComponent />
          <Toaster />
        </ErrorBoundary>
      </div>
    </BrowserRouter>
  );
};

createRoot(document.getElementById('root')!).render(<MainApp />);
