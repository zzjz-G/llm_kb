-- 课题组采购与库存管理系统 - 数据库初始化脚本
-- 适用于 PostgreSQL 12+
-- 可重复执行：使用 IF NOT EXISTS / CREATE OR REPLACE

-- ============ 枚举类型（用 check 约束替代） ============

-- ============ 表：lab_users 用户表 ============
CREATE TABLE IF NOT EXISTS lab_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    phone VARCHAR(20),
    receive_name VARCHAR(100),
    receive_phone VARCHAR(20),
    receive_address TEXT,
    register_source VARCHAR(20) NOT NULL DEFAULT 'admin_created',
    review_remark TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP(3),
    email VARCHAR(100),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,

    CONSTRAINT lab_users_role_check CHECK (role IN ('admin', 'student')),
    CONSTRAINT lab_users_status_check CHECK (status IN ('active', 'disabled', 'pending'))
);

CREATE INDEX IF NOT EXISTS idx_lab_users_email ON lab_users(email);

-- ============ 表：purchase_orders 采购订单主表 ============
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(50) NOT NULL UNIQUE,
    applicant_id UUID NOT NULL,
    applicant_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_amount NUMERIC NOT NULL DEFAULT 0,
    remark TEXT,
    review_remark TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP(3),
    stored_at TIMESTAMP(3),
    completed_at TIMESTAMP(3),
    receive_name VARCHAR(100),
    receive_phone VARCHAR(20),
    receive_address TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,

    CONSTRAINT purchase_orders_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'stored', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_applicant ON purchase_orders(applicant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- ============ 表：purchase_items 采购订单明细表 ============
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_index INTEGER NOT NULL DEFAULT 1,
    category VARCHAR(20) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    cas_no VARCHAR(50),
    is_hazardous VARCHAR(10),
    purity VARCHAR(100),
    specification VARCHAR(255),
    purchase_channel VARCHAR(100),
    purchase_link TEXT,
    apply_quantity NUMERIC NOT NULL,
    est_unit_price NUMERIC,
    est_total_price NUMERIC,
    remark TEXT,
    storage_location VARCHAR(255),
    remaining_quantity NUMERIC,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_order_id ON purchase_items(order_id);

-- ============ 表：inventory 库存台账 ============
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_name VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL,
    specification VARCHAR(255),
    cas_no VARCHAR(50),
    is_hazardous VARCHAR(10),
    purity VARCHAR(100),
    purchase_channel VARCHAR(100),
    purchase_link TEXT,
    applicant VARCHAR(100),
    in_time TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    in_quantity NUMERIC NOT NULL,
    in_unit_price NUMERIC,
    in_total_price NUMERIC,
    storage_location VARCHAR(255),
    remaining_quantity NUMERIC NOT NULL,
    remark TEXT,
    source_order_id UUID REFERENCES purchase_orders(id),
    source_item_id UUID REFERENCES purchase_items(id),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_material_name ON inventory(material_name);
CREATE INDEX IF NOT EXISTS idx_inventory_cas_no ON inventory(cas_no);

-- ============ 表：operation_logs 操作日志 ============
CREATE TABLE IF NOT EXISTS operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID,
    operator_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100),
    detail TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_operation_logs_target ON operation_logs(target_type, target_id);

-- ============ 表：hazardous_chemicals 危化品目录 ============
CREATE TABLE IF NOT EXISTS hazardous_chemicals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seq INTEGER NOT NULL,
    names TEXT[] NOT NULL DEFAULT '{}',
    alias TEXT,
    cas VARCHAR(50),
    note VARCHAR(255),
    search_keys TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hazchem_cas ON hazardous_chemicals(cas);
CREATE INDEX IF NOT EXISTS idx_hazchem_seq ON hazardous_chemicals(seq);
CREATE INDEX IF NOT EXISTS idx_hazchem_search_keys ON hazardous_chemicals USING GIN(search_keys);

-- ============ 表：email_config 邮件配置 ============
CREATE TABLE IF NOT EXISTS email_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 465,
    smtp_user VARCHAR(255) NOT NULL,
    smtp_pass VARCHAR(255) NOT NULL,
    smtp_secure BOOLEAN NOT NULL DEFAULT TRUE,
    sender_name VARCHAR(100) NOT NULL DEFAULT '课题组采购系统',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID
);

-- ============ 初始化数据：默认管理员账号 ============
-- 初始密码: admin123（bcrypt 哈希）
-- 首次登录后请立即修改密码
INSERT INTO lab_users (student_id, name, password_hash, role, status, register_source)
VALUES ('admin', '系统管理员', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 'active', 'admin_created')
ON CONFLICT (student_id) DO NOTHING;

-- ============ updated_at 自动更新触发器 ============
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lab_users_updated_at ON lab_users;
CREATE TRIGGER update_lab_users_updated_at
    BEFORE UPDATE ON lab_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_items_updated_at ON purchase_items;
CREATE TRIGGER update_purchase_items_updated_at
    BEFORE UPDATE ON purchase_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hazardous_chemicals_updated_at ON hazardous_chemicals;
CREATE TRIGGER update_hazardous_chemicals_updated_at
    BEFORE UPDATE ON hazardous_chemicals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_config_updated_at ON email_config;
CREATE TRIGGER update_email_config_updated_at
    BEFORE UPDATE ON email_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
