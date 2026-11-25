import apiClient from '@client/src/lib/axios';
import { logger } from '@client/src/lib/logger';
import type {
  LoginRequest,
  LoginResponse,
  UserInfo,
  OrderListResponse,
  PurchaseOrder as OrderDetailResponse,
  CreatePurchaseOrderRequest as CreateOrderRequest,
  StockCheckResult,
  PendingStoreCheckResponse as PendingStoreCheckResult,
  InventoryListResponse,
  InventoryItem,
  CreateInventoryRequest,
  UpdateInventoryRequest,
  ConsumeInventoryRequest as ConsumeRequest,
  LogListResponse,
  UserListResponse,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  InventoryImportResult,
  RegisterRequest,
  HazardousChemical,
  HazchemListResult,
  EmailConfigInfo,
  SaveEmailConfigRequest,
  EmailSendResult,
  CountResponse,
  StudentBadgeCountResponse,
} from '@shared/api.interface';

const TOKEN_KEY = 'lab_inventory_token';
const USER_KEY = 'lab_inventory_user';

let authClearing = false;

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): UserInfo | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserInfo): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { 'X-Lab-Auth-Token': token } : {};
}

function extractErrorMessage(error: unknown): string {
  const err = error as {
    response?: { status?: number; data?: { error?: { message?: string } } };
    message?: string;
  };
  if (err.response?.data?.error?.message) {
    return err.response.data.error.message;
  }
  if (err.response?.status === 401) {
    return '登录已过期，请重新登录';
  }
  if (err.response?.status === 403) {
    return '无操作权限';
  }
  return err.message || '操作失败，请稍后重试';
}

function isUnauthorized(error: unknown): boolean {
  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 401;
}

async function handleAuthExpired(): Promise<void> {
  if (authClearing) return;
  authClearing = true;
  clearAuth();
  const basePath = process.env.CLIENT_BASE_PATH || '/';
  // eslint-disable-next-line no-restricted-syntax
  window.location.href = basePath === '/' ? '/login' : `${basePath}/login`;
}

async function request<T>(config: {
  url: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  data?: unknown;
  params?: Record<string, unknown>;
  responseType?: 'blob' | 'json';
  silent?: boolean;
}): Promise<T> {
  try {
    const response = await apiClient({
      url: config.url,
      method: config.method,
      data: config.data,
      params: config.params,
      headers: getAuthHeaders(),
      responseType: config.responseType || 'json',
    });

    if (response.status === 401) {
      void handleAuthExpired();
      throw new Error('登录已过期，请重新登录');
    }

    if (response.status === 403) {
      throw new Error('无操作权限');
    }

    return response.data as T;
  } catch (error) {
    if (isUnauthorized(error)) {
      void handleAuthExpired();
    }
    if (!config.silent) {
      logger.error(`API request failed: ${config.method} ${config.url}`, error);
    }
    throw new Error(extractErrorMessage(error));
  }
}

export const authApi = {
  login(data: LoginRequest): Promise<LoginResponse> {
    return request<LoginResponse>({ url: '/api/auth/login', method: 'POST', data });
  },
  register(data: RegisterRequest): Promise<UserInfo> {
    return request<UserInfo>({ url: '/api/users/register', method: 'POST', data });
  },
  logout(): Promise<void> {
    return request<void>({ url: '/api/auth/logout', method: 'POST' });
  },
  getMe(): Promise<UserInfo> {
    return request<UserInfo>({ url: '/api/auth/me', method: 'GET', silent: true });
  },
};

export const usersApi = {
  list(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    role?: string;
    status?: string;
  }): Promise<UserListResponse> {
    return request<UserListResponse>({ url: '/api/users', method: 'GET', params });
  },
  create(data: CreateUserRequest): Promise<UserInfo> {
    return request<UserInfo>({ url: '/api/users', method: 'POST', data });
  },
  update(id: string, data: UpdateUserRequest): Promise<UserInfo> {
    return request<UserInfo>({ url: `/api/users/${id}`, method: 'PATCH', data });
  },
  resetPassword(id: string, newPassword: string): Promise<void> {
    return request<void>({
      url: `/api/users/${id}/reset-password`,
      method: 'POST',
      data: { newPassword },
    });
  },
  toggleStatus(id: string): Promise<UserInfo> {
    return request<UserInfo>({ url: `/api/users/${id}/disable`, method: 'POST' });
  },
  approve(id: string): Promise<UserInfo> {
    return request<UserInfo>({ url: `/api/users/${id}/approve`, method: 'POST' });
  },
  reject(id: string, reviewRemark?: string): Promise<UserInfo> {
    return request<UserInfo>({
      url: `/api/users/${id}/reject`,
      method: 'POST',
      data: { reviewRemark },
    });
  },
  remove(id: string): Promise<{ success: true }> {
    return request<{ success: true }>({ url: `/api/users/${id}`, method: 'DELETE' });
  },
  getProfile(): Promise<UserInfo> {
    return request<UserInfo>({ url: '/api/users/profile', method: 'GET' });
  },
  updateProfile(data: UpdateProfileRequest): Promise<UserInfo> {
    return request<UserInfo>({ url: '/api/users/profile', method: 'PATCH', data });
  },
  changePassword(data: ChangePasswordRequest): Promise<void> {
    return request<void>({ url: '/api/users/change-password', method: 'POST', data });
  },
  getPendingCount(): Promise<CountResponse> {
    return request<CountResponse>({ url: '/api/users/pending-count', method: 'GET', silent: true });
  },
};

export const purchaseApi = {
  checkPendingStore(): Promise<PendingStoreCheckResult> {
    return request<PendingStoreCheckResult>({
      url: '/api/purchase/check-pending-store',
      method: 'GET',
    });
  },
  getMyBadgeCount(since?: string): Promise<StudentBadgeCountResponse> {
    return request<StudentBadgeCountResponse>({
      url: '/api/purchase/my-badge-count',
      method: 'GET',
      silent: true,
      params: since ? { since } : undefined,
    });
  },
  getPendingCount(): Promise<CountResponse> {
    return request<CountResponse>({
      url: '/api/purchase/pending-count',
      method: 'GET',
      silent: true,
    });
  },
  checkStock(materialName: string): Promise<StockCheckResult> {
    return request<StockCheckResult>({
      url: '/api/purchase/check-stock',
      method: 'GET',
      params: { materialName },
    });
  },
  createOrder(data: CreateOrderRequest): Promise<OrderDetailResponse> {
    return request<OrderDetailResponse>({
      url: '/api/purchase/orders',
      method: 'POST',
      data,
    });
  },
  myOrders(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    keyword?: string;
  }): Promise<OrderListResponse> {
    return request<OrderListResponse>({
      url: '/api/purchase/orders/my',
      method: 'GET',
      params,
    });
  },
  allOrders(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    keyword?: string;
    applicantId?: string;
  }): Promise<OrderListResponse> {
    return request<OrderListResponse>({
      url: '/api/purchase/orders',
      method: 'GET',
      params,
    });
  },
  getOrder(id: string): Promise<OrderDetailResponse> {
    return request<OrderDetailResponse>({
      url: `/api/purchase/orders/${id}`,
      method: 'GET',
    });
  },
  approve(id: string, reviewRemark?: string): Promise<void> {
    return request<void>({
      url: `/api/purchase/orders/${id}/approve`,
      method: 'POST',
      data: { reviewRemark },
    });
  },
  reject(id: string, reviewRemark?: string): Promise<void> {
    return request<void>({
      url: `/api/purchase/orders/${id}/reject`,
      method: 'POST',
      data: { reviewRemark },
    });
  },
  storeOrder(
    id: string,
    items: { itemId: string; storageLocation: string; remainingQuantity: number; inUnitPrice: number }[],
  ): Promise<void> {
    return request<void>({
      url: `/api/purchase/orders/${id}/store`,
      method: 'POST',
      data: { items },
    });
  },
  completeOrder(
    id: string,
    items: { itemId: string; storageLocation: string; remainingQuantity: number }[],
  ): Promise<void> {
    return request<void>({
      url: `/api/purchase/orders/${id}/complete`,
      method: 'PATCH',
      data: { items },
    });
  },
  deleteOrder(id: string): Promise<void> {
    return request<void>({
      url: `/api/purchase/orders/${id}`,
      method: 'DELETE',
    });
  },
};

export const inventoryApi = {
  list(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    category?: string;
    storageLocation?: string;
    applicant?: string;
    casNo?: string;
  }): Promise<InventoryListResponse> {
    return request<InventoryListResponse>({
      url: '/api/inventory',
      method: 'GET',
      params,
    });
  },
  get(id: string): Promise<InventoryItem> {
    return request<InventoryItem>({ url: `/api/inventory/${id}`, method: 'GET' });
  },
  create(data: CreateInventoryRequest): Promise<InventoryItem> {
    return request<InventoryItem>({ url: '/api/inventory', method: 'POST', data });
  },
  update(id: string, data: UpdateInventoryRequest): Promise<InventoryItem> {
    return request<InventoryItem>({
      url: `/api/inventory/${id}`,
      method: 'PATCH',
      data,
    });
  },
  consume(id: string, data: ConsumeRequest): Promise<void> {
    return request<void>({
      url: `/api/inventory/${id}/consume`,
      method: 'POST',
      data,
    });
  },
  remove(id: string): Promise<void> {
    return request<void>({ url: `/api/inventory/${id}`, method: 'DELETE' });
  },
  downloadTemplate(): void {
    const url = `/api/inventory/template`;
    apiClient
      .get(url, {
        headers: getAuthHeaders(),
        responseType: 'blob',
      })
      .then((res) => {
        const blob = new Blob([res.data as BlobPart]);
        const a = document.createElement('a');
        const objUrl = URL.createObjectURL(blob);
        a.href = objUrl;
        a.download = '库存导入模板.xlsx';
        a.click();
        URL.revokeObjectURL(objUrl);
      })
      .catch((err) => {
        logger.error('下载导入模板失败', err);
      });
  },
  batchImport(rows: Record<string, unknown>[]): Promise<InventoryImportResult> {
    return request<InventoryImportResult>({
      url: '/api/inventory/batch-import',
      method: 'POST',
      data: { rows },
    });
  },
};

export const logsApi = {
  list(params: {
    page?: number;
    pageSize?: number;
    action?: string;
    targetType?: string;
    operatorName?: string;
  }): Promise<LogListResponse> {
    return request<LogListResponse>({ url: '/api/logs', method: 'GET', params });
  },
};

export interface HazchemCheckMatch {
  id: string;
  seq: string;
  names: string;
  alias: string;
  cas: string;
  note: string;
}

export interface HazchemCheckResult {
  isHazardous: boolean;
  match?: HazchemCheckMatch;
  matchType?: 'cas' | 'name' | 'alias';
}

export const hazchemApi = {
  check(params: { name?: string; cas?: string }): Promise<HazchemCheckResult> {
    return request<HazchemCheckResult>({
      url: '/api/hazardous-chemicals/check',
      method: 'POST',
      data: params,
    });
  },
  list(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
  }): Promise<HazchemListResult> {
    return request<HazchemListResult>({
      url: '/api/hazardous-chemicals',
      method: 'GET',
      params,
    });
  },
  getById(id: string): Promise<HazardousChemical> {
    return request<HazardousChemical>({
      url: `/api/hazardous-chemicals/${id}`,
      method: 'GET',
    });
  },
};

export const exportApi = {
  order(id: string): string {
    const token = getToken();
    return `/api/export/order/${id}?token=${encodeURIComponent(token || '')}`;
  },
  inventory(): string {
    const token = getToken();
    return `/api/export/inventory?token=${encodeURIComponent(token || '')}`;
  },
  downloadOrder(id: string): void {
    const url = `/api/export/order/${id}`;
    apiClient
      .get(url, {
        headers: getAuthHeaders(),
        responseType: 'blob',
      })
      .then((res) => {
        const blob = new Blob([res.data as BlobPart]);
        const disposition = (res.headers as Record<string, string>)['content-disposition'];
        let filename = '订货单.xlsx';
        if (disposition) {
          const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (match?.[1]) filename = decodeURIComponent(match[1].replace(/['"]/g, ''));
        }
        const a = document.createElement('a');
        const objUrl = URL.createObjectURL(blob);
        a.href = objUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(objUrl);
      })
      .catch((err) => {
        logger.error('导出失败', err);
      });
  },
  downloadInventory(): void {
    apiClient
      .get('/api/export/inventory', {
        headers: getAuthHeaders(),
        responseType: 'blob',
      })
      .then((res) => {
        const blob = new Blob([res.data as BlobPart]);
        const disposition = (res.headers as Record<string, string>)['content-disposition'];
        let filename = '库存台账.xlsx';
        if (disposition) {
          const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (match?.[1]) filename = decodeURIComponent(match[1].replace(/['"]/g, ''));
        }
        const a = document.createElement('a');
        const objUrl = URL.createObjectURL(blob);
        a.href = objUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(objUrl);
      })
      .catch((err) => {
        logger.error('导出失败', err);
      });
  },
};

export const emailApi = {
  getConfig(): Promise<EmailConfigInfo | null> {
    return request<EmailConfigInfo | null>({
      url: '/api/email/config',
      method: 'GET',
    });
  },
  saveConfig(data: SaveEmailConfigRequest): Promise<EmailConfigInfo> {
    return request<EmailConfigInfo>({
      url: '/api/email/config',
      method: 'POST',
      data,
    });
  },
  testEmail(toEmail: string): Promise<EmailSendResult> {
    return request<EmailSendResult>({
      url: '/api/email/test',
      method: 'POST',
      data: { toEmail },
    });
  },
};
