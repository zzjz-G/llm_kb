/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, foreignKey, index, integer, numeric, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const emailConfig = pgTable("email_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  smtpHost: varchar("smtp_host", { length: 255 }).notNull(),
  smtpPort: integer("smtp_port").notNull().default(465),
  smtpUser: varchar("smtp_user", { length: 255 }).notNull(),
  smtpPass: varchar("smtp_pass", { length: 255 }).notNull(),
  smtpSecure: boolean("smtp_secure").notNull().default(true),
  senderName: varchar("sender_name", { length: 100 }).notNull().default('课题组采购系统'),
  isActive: boolean("is_active").notNull().default(false),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const hazardousChemicals = pgTable("hazardous_chemicals", {
  id: uuid("id").primaryKey().defaultRandom(),
  seq: integer("seq").notNull(),
  names: text("names").array().notNull().default([]),
  alias: text("alias"),
  cas: varchar("cas", { length: 50 }),
  note: varchar("note", { length: 255 }),
  searchKeys: text("search_keys").array().notNull().default([]),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hazchem_cas").on(table.cas),
  index("idx_hazchem_search_keys").using("gin", table.searchKeys),
  index("idx_hazchem_seq").on(table.seq),
]);

export const operationLogs = pgTable("operation_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id"),
  operatorName: varchar("operator_name", { length: 100 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(),
  targetId: varchar("target_id", { length: 100 }),
  detail: text("detail"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_operation_logs_target").on(table.targetType, table.targetId),
]);

export const inventory = pgTable("inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  materialName: varchar("material_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 20 }).notNull(),
  specification: varchar("specification", { length: 255 }),
  casNo: varchar("cas_no", { length: 50 }),
  isHazardous: varchar("is_hazardous", { length: 10 }),
  purity: varchar("purity", { length: 100 }),
  purchaseChannel: varchar("purchase_channel", { length: 100 }),
  purchaseLink: text("purchase_link"),
  applicant: varchar("applicant", { length: 100 }),
  inTime: customTimestamptz("in_time", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  inQuantity: numeric("in_quantity").notNull(),
  inUnitPrice: numeric("in_unit_price"),
  inTotalPrice: numeric("in_total_price"),
  storageLocation: varchar("storage_location", { length: 255 }),
  remainingQuantity: numeric("remaining_quantity").notNull(),
  remark: text("remark"),
  sourceOrderId: uuid("source_order_id"),
  sourceItemId: uuid("source_item_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_inventory_category").on(table.category),
  index("idx_inventory_material_name").on(table.materialName),
  index("idx_inventory_cas_no").on(table.casNo),
  foreignKey({
    columns: [table.sourceOrderId],
    foreignColumns: [purchaseOrders.id],
    name: "inventory_source_order_id_fkey",
  }),
  foreignKey({
    columns: [table.sourceItemId],
    foreignColumns: [purchaseItems.id],
    name: "inventory_source_item_id_fkey",
  }),
]);

export const purchaseItems = pgTable("purchase_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull(),
  itemIndex: integer("item_index").notNull().default(1),
  category: varchar("category", { length: 20 }).notNull(),
  materialName: varchar("material_name", { length: 255 }).notNull(),
  casNo: varchar("cas_no", { length: 50 }),
  isHazardous: varchar("is_hazardous", { length: 10 }),
  purity: varchar("purity", { length: 100 }),
  specification: varchar("specification", { length: 255 }),
  purchaseChannel: varchar("purchase_channel", { length: 100 }),
  purchaseLink: text("purchase_link"),
  applyQuantity: numeric("apply_quantity").notNull(),
  estUnitPrice: numeric("est_unit_price"),
  estTotalPrice: numeric("est_total_price"),
  remark: text("remark"),
  storageLocation: varchar("storage_location", { length: 255 }),
  remainingQuantity: numeric("remaining_quantity"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_purchase_items_order_id").on(table.orderId),
  foreignKey({
    columns: [table.orderId],
    foreignColumns: [purchaseOrders.id],
    name: "purchase_items_order_id_fkey",
  }).onDelete("cascade"),
]);

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNo: varchar("order_no", { length: 50 }).notNull().unique(),
  applicantId: uuid("applicant_id").notNull(),
  applicantName: varchar("applicant_name", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  totalAmount: numeric("total_amount").notNull().default('0'),
  remark: text("remark"),
  reviewRemark: text("review_remark"),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: customTimestamptz("reviewed_at", { precision: 3 }),
  storedAt: customTimestamptz("stored_at", { precision: 3 }),
  completedAt: customTimestamptz("completed_at", { precision: 3 }),
  receiveName: varchar("receive_name", { length: 100 }),
  receivePhone: varchar("receive_phone", { length: 20 }),
  receiveAddress: text("receive_address"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("purchase_orders_order_no_key").on(table.orderNo),
  index("idx_purchase_orders_applicant").on(table.applicantId),
  index("idx_purchase_orders_status").on(table.status),
]);

export const labUsers = pgTable("lab_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: varchar("student_id", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default('student'),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  phone: varchar("phone", { length: 20 }),
  receiveName: varchar("receive_name", { length: 100 }),
  receivePhone: varchar("receive_phone", { length: 20 }),
  receiveAddress: text("receive_address"),
  registerSource: varchar("register_source", { length: 20 }).notNull().default('admin_created'),
  reviewRemark: text("review_remark"),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: customTimestamptz("reviewed_at", { precision: 3 }),
  email: varchar("email", { length: 100 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("lab_users_student_id_key").on(table.studentId),
  index("idx_lab_users_email").on(table.email),
]);

// table aliases
export const emailConfigTable = emailConfig;
export const hazardousChemicalsTable = hazardousChemicals;
export const inventoryTable = inventory;
export const labUsersTable = labUsers;
export const operationLogsTable = operationLogs;
export const purchaseItemsTable = purchaseItems;
export const purchaseOrdersTable = purchaseOrders;
