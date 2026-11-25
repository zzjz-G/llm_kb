# 课题组耗材采购与库存管理系统（独立部署版）

高校课题组耗材采购申请与库存进销存管理系统，完全脱离平台、可在普通服务器（含 ARM 架构树莓派）上独立运行。

## 功能特性

- **两级账号体系**：管理员（老师）、学生，学号登录，JWT 认证
- **采购申请**：一单多品，提交时自动检索库存预警与危化品识别
- **审批流程**：待审核 → 已通过/已驳回 → 已入库 → 已完成
- **库存台账**：入库、领用、消耗、Excel 导入导出
- **危化品目录**：自动识别危险化学品并高亮提示
- **邮件提醒**：采购审批、注册审批等节点邮件通知
- **操作日志**：所有关键操作留痕可追溯

## 目录结构

```
.
├── client/                    # 前端 React 应用
│   ├── index.html
│   └── src/
│       ├── api/               # API 调用层
│       ├── components/        # UI 组件
│       ├── lib/               # 工具库（axios、logger）
│       ├── pages/             # 页面组件
│       ├── hooks/             # 自定义 Hooks
│       └── ...
├── server/                    # 后端 NestJS 应用
│   ├── bootstrap.ts           # 独立版入口（替代平台 main.ts）
│   ├── app.module.ts          # 根模块
│   ├── common/                # 公共模块（数据库、JWT、异常处理）
│   ├── database/
│   │   ├── tables.ts          # Drizzle schema（标准 PG 类型）
│   │   ├── migrations/        # SQL 迁移脚本
│   │   └── migrate.js         # 迁移执行脚本
│   └── modules/               # 业务模块
│       ├── auth/              # 认证
│       ├── users/             # 用户管理
│       ├── purchase/          # 采购订单
│       ├── inventory/         # 库存台账
│       ├── email/             # 邮件配置与发送
│       ├── hazardous-chemicals/ # 危化品目录
│       ├── logs/              # 操作日志
│       ├── export/            # Excel 导出
│       └── view/              # 视图渲染
├── shared/                    # 前后端共享类型
├── .env.example               # 环境变量示例
├── vite.config.ts             # Vite 配置（前端构建）
├── tailwind.config.ts         # Tailwind 配置
├── tsconfig.standalone.json   # 后端 TypeScript 配置
├── nest-cli.standalone.json   # Nest CLI 配置
└── package.standalone.json    # 独立版 package.json
```

## 环境变量

复制 `.env.example` 为 `.env` 并按需修改：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接串 | 必填 |
| `JWT_SECRET` | JWT 签名密钥（生产环境务必修改） | `change_this_to_a_strong_random_secret_key` |
| `SERVER_HOST` | 服务端监听地址 | `0.0.0.0` |
| `SERVER_PORT` | 服务端监听端口 | `3000` |
| `NODE_ENV` | 运行环境 | `production` |
| `CLIENT_BASE_PATH` | 前端路径前缀（子路径部署时配置） | `/` |
| `CORS_ORIGIN` | 允许的 CORS 源（逗号分隔） | 空=允许所有 |
| `BODY_LIMIT` | 请求体大小限制 | `10mb` |

## 快速开始

### 1. 环境要求

- Node.js >= 22.0.0（兼容 ARM64 / 树莓派）
- PostgreSQL >= 12
- npm 或 pnpm

### 2. 准备配置文件

```bash
# 复制独立版 package.json
cp package.standalone.json package.json

# 复制环境变量模板
cp .env.example .env

# 编辑 .env，填写数据库连接信息和 JWT 密钥
```

### 3. 安装依赖

```bash
npm install
```

### 4. 初始化数据库

```bash
# 创建数据库（PostgreSQL 中执行）
CREATE DATABASE lab_inventory;

# 执行迁移
node server/database/migrate.js
```

迁移脚本会自动创建所有表、索引、触发器，并初始化默认管理员账号：
- 学号：`admin`
- 密码：`admin123`
- ⚠️ 首次登录后请立即修改密码

### 5. 构建

```bash
# 同时构建前端和后端
npm run build
```

构建产物目录：

```
dist/
├── server/     # 后端编译输出
│   ├── bootstrap.js
│   ├── app.module.js
│   ├── common/
│   ├── modules/
│   └── ...
├── shared/     # 共享类型编译输出
└── client/     # 前端构建产物
    ├── index.html
    ├── assets/
    └── ...
```

### 6. 启动

```bash
# 生产环境启动
npm start
```

服务启动后访问 `http://localhost:3000`（端口根据 `SERVER_PORT` 配置）。

## 开发模式

```bash
# 同时启动前后端开发服务器（3 个进程：tsc 编译、node 运行、vite 前端）
npm run dev
```

也可以分别启动：

```bash
# 终端 1：监听 TypeScript 编译（后端）
npm run dev:tsc

# 终端 2：运行后端（监听 dist 变化自动重启）
npm run dev:server

# 终端 3：前端 dev server
npm run dev:client
```

- 前端：http://localhost:5173 （Vite dev server，API 代理到 3000）
- 后端：http://localhost:3000

> 注意：首次运行 dev 前需先执行一次 `npm run build:server` 生成初始 dist 目录，或等待 tsc 首次编译完成。

## 数据库说明

### 表结构

| 表名 | 说明 |
|------|------|
| `lab_users` | 用户表（学生+管理员） |
| `purchase_orders` | 采购订单主表 |
| `purchase_items` | 采购订单明细表 |
| `inventory` | 库存台账 |
| `hazardous_chemicals` | 危化品目录 |
| `operation_logs` | 操作日志 |
| `email_config` | 邮件配置 |
| `schema_migrations` | 迁移记录表 |

### 类型映射（平台 → 独立版）

| 平台自定义类型 | 标准 PostgreSQL 类型 | 说明 |
|----------------|---------------------|------|
| `user_profile` | `UUID` | 创建人/更新人ID |
| `file_attachment` | `JSONB` | 文件附件信息 |
| `customTimestamptz` | `TIMESTAMP(3)` | 带毫秒精度的时间戳 |

### 迁移管理

新增迁移：在 `server/database/migrations/` 目录下添加新的 `.sql` 文件，命名格式为 `XXX_description.sql`（三位数字前缀），然后执行：

```bash
node server/database/migrate.js
```

迁移脚本支持幂等执行，已应用的迁移会自动跳过。

## 部署说明

### 系统服务（推荐生产环境使用）

使用 systemd 管理服务：

```ini
# /etc/systemd/system/lab-inventory.service
[Unit]
Description=Lab Purchase & Inventory System
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/lab-inventory
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server/bootstrap.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
COPY .env ./
EXPOSE 3000
CMD ["node", "dist/server/bootstrap.js"]
```

### ARM / 树莓派部署

本项目全部使用纯 JavaScript/TypeScript 依赖，无 native addon 编译需求，可直接在 ARM64 架构的树莓派上运行：

```bash
# 树莓派上直接构建
npm install
npm run build
npm start
```

## 从平台版本迁移

如果你正在使用妙搭/豆包平台版本，迁移步骤如下：

1. 导出平台数据库数据（使用 `pg_dump`）
2. 在独立版数据库中执行迁移创建表结构
3. 使用 `pg_restore` 或 CSV 导入迁移业务数据（注意列名映射：snake_case 保持一致）
4. 配置环境变量启动服务

## 技术栈

**前端**：
- React 19 + TypeScript
- Vite 6
- Tailwind CSS 3
- React Router 7
- TanStack Query
- shadcn/ui + Radix UI
- Ant Design Table
- Lucide React Icons

**后端**：
- NestJS 10 + TypeScript
- Drizzle ORM + postgres-js
- PostgreSQL
- JWT 认证
- class-validator 校验
- Nodemailer（邮件）
- SheetJS（Excel 导入导出）

## License

MIT
