import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@client/src/contexts/AuthContext';
import ErrorBoundary from "@client/src/components/ErrorBoundary";
import { Skeleton } from '@client/src/components/ui/skeleton';
import Layout from '@client/src/components/Layout';
import LoginPage from '@client/src/pages/LoginPage';
import RegisterPage from '@client/src/pages/RegisterPage';
import PurchaseNewPage from '@client/src/pages/PurchaseNewPage';
import PurchaseMyPage from '@client/src/pages/PurchaseMyPage';
import PurchaseAdminPage from '@client/src/pages/PurchaseAdminPage';
import OrderDetailPage from '@client/src/pages/OrderDetailPage';
import InventoryPage from '@client/src/pages/InventoryPage';
import UsersPage from '@client/src/pages/UsersPage';
import LogsPage from '@client/src/pages/LogsPage';
import ProfilePage from '@client/src/pages/ProfilePage';
import HazardousChemicalsPage from '@client/src/pages/HazardousChemicalsPage';
import EmailConfigPage from '@client/src/pages/EmailConfigPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { state: { from: location.pathname } });
    }
  }, [user, isLoading, navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  if (!user) return null;
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user?.role !== 'admin') {
    return <Navigate to="/inventory" replace />;
  }
  return <>{children}</>;
};

const StudentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user?.role !== 'student') {
    return <Navigate to="/purchase" replace />;
  }
  return <>{children}</>;
};

const HomeRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/purchase" replace />;
  return <Navigate to="/purchase/new" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <HomeRedirect />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase/new"
          element={
            <ProtectedRoute>
              <StudentRoute>
                <Layout>
                  <PurchaseNewPage />
                </Layout>
              </StudentRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase/my"
          element={
            <ProtectedRoute>
              <StudentRoute>
                <Layout>
                  <PurchaseMyPage />
                </Layout>
              </StudentRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Layout>
                  <PurchaseAdminPage />
                </Layout>
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <OrderDetailPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <Layout>
                <InventoryPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Layout>
                  <UsersPage />
                </Layout>
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/logs"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Layout>
                  <LogsPage />
                </Layout>
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hazardous-chemicals"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Layout>
                  <HazardousChemicalsPage />
                </Layout>
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/email-config"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Layout>
                  <EmailConfigPage />
                </Layout>
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </AuthProvider>
  );
};

export default App;
