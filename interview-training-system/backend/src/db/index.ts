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
 * 规范化查询参数，确保类型兼容 MySQL2
 * 
 * MySQL2 的 prepared statement 要求：
 * - 所有参数类型必须一致或兼容
 * - number 类型可以直接传递
 * - string 类型会被正确处理
 * 
 * @param params 原始参数数组
 * @returns 规范化后的参数数组
 */
function normalizeParams(params: any[]): any[] {
  return params.map(param => {
    // null 和 undefined 保持不变
    if (param === null || param === undefined) {
      return param;
    }
    // 确保 number 类型保持为 number（不转字符串）
    if (typeof param === 'number') {
      return param;
    }
    // 其他类型保持原样
    return param;
  });
}

/**
 * 执行查询（使用 prepared statement）
 * 
 * 注意：对于包含 LIMIT/OFFSET 的分页查询，请使用 queryWithPagination() 函数
 * 
 * @example
 * // 基本查询
 * const users = await query<User>('SELECT * FROM users WHERE id = ?', [1]);
 */
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const finalParams = params ? normalizeParams(params) : [];
  
  // 开发环境下记录详细日志
  if (process.env.NODE_ENV === 'development') {
    console.log('执行查询 - SQL:', sql.substring(0, 100));
    console.log('参数:', finalParams, '类型:', finalParams.map(p => typeof p));
  }
  
  const [rows] = await getPool().execute(sql, finalParams);
  return rows as T[];
}

/**
 * 执行包含 LIMIT/OFFSET 的分页查询
 * 
 * 由于 MySQL2 的 execute() 方法对 LIMIT/OFFSET 参数类型处理有已知问题，
 * 此函数使用 query() 方法并通过字符串拼接处理分页参数（已验证安全性）
 * 
 * @param sql SQL 语句（不包含 LIMIT/OFFSET）
 * @param params SQL 参数
 * @param limit 限制数量（已验证为正整数）
 * @param offset 偏移量（已验证为非负整数）
 * 
 * @example
 * const questions = await queryWithPagination(
 *   'SELECT * FROM questions WHERE category = ?',
 *   ['english-oral'],
 *   50,
 *   0
 * );
 */
export async function queryWithPagination<T = any>(
  sql: string, 
  params: any[], 
  limit: number, 
  offset: number
): Promise<T[]> {
  // 验证分页参数（防止 SQL 注入）
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 1000));
  const safeOffset = Math.max(0, Math.floor(offset));
  
  // 使用 query() 而不是 execute() 来避免 LIMIT/OFFSET 参数类型问题
  const finalParams = params ? normalizeParams(params) : [];
  const fullSql = `${sql} LIMIT ${safeLimit} OFFSET ${safeOffset}`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('执行分页查询 - SQL:', fullSql.substring(0, 150));
    console.log('参数:', finalParams);
  }
  
  const [rows] = await getPool().query(fullSql, finalParams);
  return rows as T[];
}

/**
 * 执行单条查询
 * 
 * @example
 * const user = await queryOne<User>('SELECT * FROM users WHERE id = ?', [1]);
 * if (user) {
 *   console.log(user.name);
 * }
 */
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 执行插入并返回插入的 ID
 * 
 * @example
 * const id = await insert(
 *   'INSERT INTO users (name, email) VALUES (?, ?)',
 *   ['John', 'john@example.com']
 * );
 */
export async function insert(sql: string, params?: any[]): Promise<number> {
  const finalParams = params ? normalizeParams(params) : [];
  const [result] = await getPool().execute(sql, finalParams);
  return (result as mysql.ResultSetHeader).insertId;
}

/**
 * 执行更新/删除并返回影响的行数
 * 
 * @example
 * const affected = await execute(
 *   'UPDATE users SET status = ? WHERE id = ?',
 *   ['active', 1]
 * );
 */
export async function execute(sql: string, params?: any[]): Promise<number> {
  const finalParams = params ? normalizeParams(params) : [];
  const [result] = await getPool().execute(sql, finalParams);
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
    console.log('💡 提示：如需导入种子数据，请在管理页面操作');
    console.log('');
    
    // 注释掉自动导入种子数据
    // 现在通过页面手动触发导入
    // const { seedSchoolProfiles } = await import('./seeds/schools.js');
    // await seedSchoolProfiles();
    // const { seedQuestions } = await import('./seeds/questions.js');
    // await seedQuestions();
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
