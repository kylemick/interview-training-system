/**
 * MySQL 数据库连接和初始化
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'interview_training',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// 创建连接池
let pool: mysql.Pool;

/**
 * 获取数据库连接池
 */
export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

/**
 * 获取数据库连接
 */
export async function getConnection(): Promise<mysql.PoolConnection> {
  return await getPool().getConnection();
}

/**
 * 执行查询
 */
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}

/**
 * 执行单条查询
 */
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 执行插入并返回插入的 ID
 */
export async function insert(sql: string, params?: any[]): Promise<number> {
  const [result] = await getPool().execute(sql, params);
  return (result as mysql.ResultSetHeader).insertId;
}

/**
 * 执行更新/删除并返回影响的行数
 */
export async function execute(sql: string, params?: any[]): Promise<number> {
  const [result] = await getPool().execute(sql, params);
  return (result as mysql.ResultSetHeader).affectedRows;
}

/**
 * 初始化数据库（创建数据库和表）
 */
export async function initDatabase(): Promise<void> {
  console.log('🗄️  初始化 MySQL 数据库...');

  try {
    // 首先连接到 MySQL 服务器（不指定数据库）
    const connectionWithoutDb = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    // 创建数据库（如果不存在）
    await connectionWithoutDb.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ 数据库 ${dbConfig.database} 已准备就绪`);
    await connectionWithoutDb.end();

    // 连接到指定数据库
    const connection = await mysql.createConnection({
      ...dbConfig,
      database: dbConfig.database,
    });

    // 读取并执行 schema.sql
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // 分割并执行每个 SQL 语句
    const statements = schema
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      await connection.query(statement);
    }

    console.log('✅ 数据表创建成功');

    await connection.end();

    console.log('✅ 数据库初始化完成');
    console.log('');
    console.log('数据库配置:');
    console.log(`  主机: ${dbConfig.host}`);
    console.log(`  端口: ${dbConfig.port}`);
    console.log(`  数据库: ${dbConfig.database}`);
    console.log(`  用户: ${dbConfig.user}`);
    console.log('');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
}

/**
 * 获取数据库统计信息
 */
export async function getStats(): Promise<{
  schools: number;
  questions: number;
  plans: number;
  sessions: number;
}> {
  try {
    const [schools] = await query<{ count: number }>('SELECT COUNT(*) as count FROM school_profiles');
    const [questions] = await query<{ count: number }>('SELECT COUNT(*) as count FROM questions');
    const [plans] = await query<{ count: number }>('SELECT COUNT(*) as count FROM training_plans');
    const [sessions] = await query<{ count: number }>('SELECT COUNT(*) as count FROM sessions');

    return {
      schools: schools?.count || 0,
      questions: questions?.count || 0,
      plans: plans?.count || 0,
      sessions: sessions?.count || 0,
    };
  } catch (error) {
    console.error('获取统计信息失败:', error);
    return { schools: 0, questions: 0, plans: 0, sessions: 0 };
  }
}

/**
 * 关闭数据库连接池
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    console.log('✅ 数据库连接池已关闭');
  }
}

// 如果直接运行此文件，执行初始化
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase()
    .then(() => {
      console.log('✅ 初始化完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 初始化失败:', error);
      process.exit(1);
    });
}
