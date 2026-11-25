#!/usr/bin/env node
/**
 * 数据库迁移脚本
 * 执行 server/database/migrations/ 目录下的 SQL 迁移文件
 * 使用方式：node server/database/migrate.js
 */

const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('错误：未设置 DATABASE_URL 环境变量');
  process.exit(1);
}

const migrationsDir = path.join(__dirname, 'migrations');

async function main() {
  const sql = postgres(DATABASE_URL);

  console.log('连接数据库...');

  try {
    await sql`SELECT 1`;
    console.log('数据库连接成功');
  } catch (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  }

  // 确保迁移记录表存在
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // 获取已应用的迁移
  const applied = await sql`SELECT version FROM schema_migrations ORDER BY version`;
  const appliedVersions = new Set(applied.map((row) => row.version));

  // 读取迁移文件
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`找到 ${files.length} 个迁移文件`);

  let appliedCount = 0;
  for (const file of files) {
    const version = file.replace('.sql', '');

    if (appliedVersions.has(version)) {
      console.log(`跳过 ${file} (已应用)`);
      continue;
    }

    console.log(`应用迁移: ${file}`);
    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    try {
      await sql.begin(async (tx) => {
        await tx.unsafe(sqlContent);
        await tx`INSERT INTO schema_migrations (version) VALUES (${version})`;
      });
      appliedCount++;
      console.log(`  ✓ 成功`);
    } catch (err) {
      console.error(`  ✗ 失败: ${err.message}`);
      await sql.end();
      process.exit(1);
    }
  }

  console.log(`\n迁移完成！本次应用 ${appliedCount} 个迁移，共 ${applied.size + appliedCount} 个。`);
  await sql.end();
}

main().catch((err) => {
  console.error('迁移出错:', err);
  process.exit(1);
});
