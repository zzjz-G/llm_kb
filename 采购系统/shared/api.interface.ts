/* 前后端共享的类型写在这里 */

// ==================== 枚举常量 ====================

export const USER_ROLES = ['admin', 'student'] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: '管理员',
  student: '学生',
};

export const USER_STATUS = ['active', 'disabled', 'pending'] as const;
export type UserStatus = (typeof USER_STATUS)[number];
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: '正常',
  disabled: '已禁用',
  pending: '待审核',
};

export const MATERIAL_CATEGORIES = ['chemical_reagent', 'chemical_supply', 'instrument'] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];
export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  chemical_reagent: '化学试剂',
  chemical_supply: '化学耗材',
  instrument: '仪器设备',
};

export const HAZARDOUS_OPTIONS = ['yes', 'no'] as const;
export type HazardousOption = (typeof HAZARDOUS_OPTIONS)[number];
export const HAZARDOUS_LABELS: Record<HazardousOption, string> = {
  yes: '是',
  no: '否',
};

export const ORDER_STATUSES = ['pending', 'approved', 'rejected', 'stored', 'completed'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const isOrderStatus = (v: string): v is OrderStatus =>
  (ORDER_STATUSES as readonly string[]).includes(v);
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  stored: '已入库',
  completed: '已完成',
};

export const LOG_ACTIONS = [
  'create_user', 'update_user', 'disable_user', 'reset_password', 'self_register',
  'approve_user', 'reject_user', 'delete_user',
  'create_order', 'approve_order', 'reject_order', 'store_order',
  'complete_order', 'delete_order', 'create_inventory', 'update_inventory', 'consume_inventory',
  'delete_inventory', 'update_profile',
  'save_email_config', 'test_email', 'send_email_fail',
] as const;
export type LogAction = (typeof LOG_ACTIONS)[number];
export const LOG_ACTION_LABELS: Record<LogAction, string> = {
  create_user: '创建用户',
  update_user: '更新用户',
  disable_user: '禁用用户',
  reset_password: '重置密码',
  self_register: '自助注册',
  approve_user: '审批通过',
  reject_user: '审批拒绝',
  delete_user: '删除用户',
  update_profile: '修改个人资料',
  create_order: '提交采购单',
  approve_order: '审核通过',
  reject_order: '审核驳回',
  store_order: '登记入库',
  complete_order: '补填完成',
  delete_order: '删除订单',
  create_inventory: '新增库存',
  update_inventory: '修改库存',
  consume_inventory: '领用消耗',
  delete_inventory: '删除库存',
  save_email_config: '保存邮件配置',
  test_email: '发送测试邮件',
  send_email_fail: '邮件发送失败',
};

// ==================== 用户相关 ====================

export const REGISTER_SOURCES = ['admin_created', 'self_registered'] as const;
export type RegisterSource = (typeof REGISTER_SOURCES)[number];
export const REGISTER_SOURCE_LABELS: Record<RegisterSource, string> = {
  admin_created: '管理员创建',
  self_registered: '自助注册',
};

export interface UserInfo {
  id: string;
  studentId: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  registerSource: RegisterSource;
  email?: string;
  phone?: string;
  receiveName?: string;
  receivePhone?: string;
  receiveAddress?: string;
  reviewRemark?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface LoginRequest {
  studentId: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface CreateUserRequest {
  studentId: string;
  name: string;
  password: string;
  role: UserRole;
}

export interface RegisterRequest {
  studentId: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  receiveName: string;
  receivePhone: string;
  receiveAddress: string;
}

export interface UpdateUserRequest {
  name?: string;
  role?: UserRole;
  status?: UserStatus;
  email?: string;
  phone?: string;
}

export interface UpdateProfileRequest {
  receiveName?: string;
  receivePhone?: string;
  receiveAddress?: string;
  phone?: string;
  name?: string;
  email?: string;
}

export interface ResetPasswordRequest {
  password: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface UserListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserListResponse {
  items: UserInfo[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== 采购订单相关 ====================

export interface PurchaseItem {
  id: string;
  orderId: string;
  itemIndex: number;
  category: MaterialCategory;
  materialName: string;
  casNo?: string;
  isHazardous?: HazardousOption;
  purity?: string;
  specification?: string;
  purchaseChannel?: string;
  purchaseLink?: string;
  applyQuantity: number;
  estUnitPrice?: number;
  estTotalPrice?: number;
  remark?: string;
  storageLocation?: string;
  remainingQuantity?: number;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  orderNo: string;
  applicantId: string;
  applicantName: string;
  status: OrderStatus;
  totalAmount: number;
  remark?: string;
  reviewRemark?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  storedAt?: string;
  completedAt?: string;
  createdAt: string;
  items: PurchaseItem[];
  receiveName?: string;
  receivePhone?: string;
  receiveAddress?: string;
}

export interface CreatePurchaseItemRequest {
  category: MaterialCategory;
  materialName: string;
  casNo?: string;
  isHazardous?: HazardousOption;
  purity?: string;
  specification?: string;
  purchaseChannel?: string;
  purchaseLink?: string;
  applyQuantity: number;
  estUnitPrice?: number;
  remark?: string;
}

export interface CreatePurchaseOrderRequest {
  items: CreatePurchaseItemRequest[];
  remark?: string;
}

export interface ReviewOrderRequest {
  reviewRemark?: string;
}

export interface StoreItemRequest {
  itemId: string;
  storageLocation?: string;
  remainingQuantity?: number;
  inUnitPrice?: number;
}

export interface StoreOrderRequest {
  items: StoreItemRequest[];
}

export interface CompleteItemRequest {
  itemId: string;
  storageLocation: string;
  remainingQuantity: number;
}

export interface CompleteOrderRequest {
  items: CompleteItemRequest[];
}

export interface OrderListQuery {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  keyword?: string;
  applicantId?: string;
}

export interface OrderListResponse {
  items: PurchaseOrder[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StockCheckResult {
  materialName: string;
  hasStock: boolean;
  stockItems: {
    id: string;
    materialName: string;
    specification?: string;
    remainingQuantity: number;
    storageLocation?: string;
  }[];
}

export interface PendingStoreCheckResponse {
  hasPending: boolean;
  pendingOrders: {
    id: string;
    orderNo: string;
    itemCount: number;
  }[];
}

export interface CountResponse {
  count: number;
}

export interface StudentBadgeCountResponse {
  pendingStoreCount: number;
  newApprovalCount: number;
}

// ==================== 库存相关 ====================

export interface InventoryItem {
  id: string;
  materialName: string;
  category: MaterialCategory;
  specification?: string;
  casNo?: string;
  isHazardous?: HazardousOption;
  purity?: string;
  purchaseChannel?: string;
  purchaseLink?: string;
  applicant?: string;
  inTime: string;
  inQuantity: number;
  inUnitPrice?: number;
  inTotalPrice?: number;
  storageLocation?: string;
  remainingQuantity: number;
  remark?: string;
  sourceOrderId?: string;
  sourceItemId?: string;
}

export interface CreateInventoryRequest {
  materialName: string;
  category: MaterialCategory;
  specification?: string;
  casNo?: string;
  isHazardous?: HazardousOption;
  purity?: string;
  purchaseChannel?: string;
  purchaseLink?: string;
  applicant?: string;
  inQuantity: number;
  inUnitPrice?: number;
  inTotalPrice?: number;
  storageLocation?: string;
  remark?: string;
}

export interface UpdateInventoryRequest {
  materialName?: string;
  category?: MaterialCategory;
  specification?: string;
  casNo?: string;
  isHazardous?: HazardousOption;
  purity?: string;
  purchaseChannel?: string;
  purchaseLink?: string;
  applicant?: string;
  inQuantity?: number;
  inUnitPrice?: number;
  inTotalPrice?: number;
  storageLocation?: string;
  remainingQuantity?: number;
  remark?: string;
}

export interface ConsumeInventoryRequest {
  quantity: number;
  remark?: string;
}

export interface InventoryQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: MaterialCategory;
  storageLocation?: string;
  applicant?: string;
  casNo?: string;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== 操作日志 ====================

export interface OperationLog {
  id: string;
  operatorId?: string;
  operatorName: string;
  action: LogAction;
  targetType: string;
  targetId?: string;
  detail?: string;
  createdAt: string;
}

export interface LogQuery {
  page?: number;
  pageSize?: number;
  action?: LogAction;
  targetType?: string;
  operatorName?: string;
}

export interface LogListResponse {
  items: OperationLog[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InventoryImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface InventoryImportResult {
  successCount: number;
  failCount: number;
  errors: InventoryImportRowError[];
  importedIds: string[];
}

// ==================== 危险化学品相关 ====================

export interface HazardousChemical {
  id: string;
  seq: number;
  names: string[];
  alias?: string;
  cas?: string;
  note?: string;
}

export interface HazchemCheckRequest {
  name?: string;
  cas?: string;
}

export interface HazchemCheckResult {
  isHazardous: boolean;
  match?: HazardousChemical;
  matchType?: 'cas' | 'name' | 'alias';
  candidates?: HazardousChemical[];
  conflictWarning?: string;
}

export interface HazchemListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface HazchemListResult {
  items: HazardousChemical[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== 邮件配置 ====================

export interface EmailConfigInfo {
  id: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpSecure: boolean;
  senderName: string;
  isActive: boolean;
  createdAt: string;
}

export interface SaveEmailConfigRequest {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
  senderName: string;
  isActive: boolean;
}

export interface TestEmailRequest {
  toEmail: string;
}

export interface EmailSendResult {
  success: boolean;
  message?: string;
}

export interface ApiResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}
