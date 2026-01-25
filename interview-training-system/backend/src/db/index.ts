/**
 * MySQL 數據庫连接和初始化
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 數據庫配置
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

// 創建连接池
let pool: mysql.Pool;

// 查询缓存：简单的內存缓存，5分鐘TTL
interface CacheEntry {
  data: any
  timestamp: number
  expiresAt: number
}

const queryCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5分鐘

// 慢查询阈值（毫秒）
const SLOW_QUERY_THRESHOLD = 100

/**
 * 生成查询的缓存key
 */
function getCacheKey(sql: string, params?: any[]): string {
  const paramsStr = params ? JSON.stringify(params) : ''
  return `${sql}:${paramsStr}`
}

/**
 * 清除查询缓存
 */
export function clearQueryCache(pattern?: string) {
  if (!pattern) {
    queryCache.clear()
    return
  }
  // 清除匹配模式的缓存
  for (const key of queryCache.keys()) {
    if (key.includes(pattern)) {
      queryCache.delete(key)
    }
  }
}

/**
 * 解析 JSON 字段（統一处理）
 */
export function parseJsonField(value: any, fieldName: string): any {
  if (!value) return []
  try {
    return typeof value === 'string' ? JSON.parse(value) : value
  } catch (error) {
    console.warn(`解析 ${fieldName} JSON 字段失敗:`, error)
    return []
  }
}

/**
 * 获取數據庫连接池
 */
export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

/**
 * 获取數據庫连接
 */
export async function getConnection(): Promise<mysql.PoolConnection> {
  return await getPool().getConnection();
}

/**
 * 規范化查询參數，確保類型兼容 MySQL2
 * 
 * MySQL2 的 prepared statement 要求：
 * - 所有參數類型必须一致或兼容
 * - number 類型可以直接傳递
 * - string 類型會被正確处理
 * 
 * @param params 原始參數數組
 * @returns 規范化後的參數數組
 */
function normalizeParams(params: any[]): any[] {
  return params.map(param => {
    // null 和 undefined 保持不变
    if (param === null || param === undefined) {
      return param;
    }
    // 確保 number 類型保持为 number（不转字符串）
    if (typeof param === 'number') {
      return param;
    }
    // 其他類型保持原樣
    return param;
  });
}

/**
 * 执行查询（使用 prepared statement）
 * 
 * 注意：對于包含 LIMIT/OFFSET 的分页查询，请使用 queryWithPagination() 函數
 * 
 * @param sql SQL 語句
 * @param params 查询參數
 * @param useCache 是否使用缓存（默认 false，仅用于读多写少的查询）
 * 
 * @example
 * // 基本查询
 * const users = await query<User>('SELECT * FROM users WHERE id = ?', [1]);
 * 
 * // 使用缓存的查询
 * const schools = await query('SELECT * FROM school_profiles', [], true);
 */
export async function query<T = any>(sql: string, params?: any[], useCache = false): Promise<T[]> {
  const finalParams = params ? normalizeParams(params) : [];
  const cacheKey = getCacheKey(sql, finalParams);
  
  // 检查缓存（仅用于读查询且启用缓存）
  if (useCache && sql.trim().toUpperCase().startsWith('SELECT')) {
    const cached = queryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ 缓存命中:', sql.substring(0, 50));
      }
      return cached.data as T[];
    }
  }
  
  // 記錄查询開始時間
  const startTime = Date.now();
  
  // 開發环境下記錄详细日志
  if (process.env.NODE_ENV === 'development') {
    console.log('执行查询 - SQL:', sql.substring(0, 100));
    console.log('參數:', finalParams, '類型:', finalParams.map(p => typeof p));
  }
  
  try {
    const [rows] = await getPool().execute(sql, finalParams);
    const duration = Date.now() - startTime;
    
    // 記錄慢查询
    if (duration > SLOW_QUERY_THRESHOLD) {
      console.warn(`⚠️  慢查询 (${duration}ms):`, sql.substring(0, 150));
      console.warn('   參數:', finalParams);
    }
    
    // 缓存結果（仅用于读查询且启用缓存）
    if (useCache && sql.trim().toUpperCase().startsWith('SELECT')) {
      queryCache.set(cacheKey, {
        data: rows,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_TTL,
      });
    }
    
    return rows as T[];
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ 查询失敗 (${duration}ms):`, sql.substring(0, 100));
    console.error('   參數:', finalParams);
    throw error;
  }
}

/**
 * 执行包含 LIMIT/OFFSET 的分页查询
 * 
 * 由于 MySQL2 的 execute() 方法對 LIMIT/OFFSET 參數類型处理有已知問題，
 * 此函數使用 query() 方法并通過字符串拼接处理分页參數（已验证安全性）
 * 
 * @param sql SQL 語句（不包含 LIMIT/OFFSET）
 * @param params SQL 參數
 * @param limit 限制數量（已验证为正整數）
 * @param offset 偏移量（已验证为非负整數）
 * @param useCache 是否使用缓存（默认 false）
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
  offset: number,
  useCache = false
): Promise<T[]> {
  // 验证分页參數（防止 SQL 注入）
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 1000));
  const safeOffset = Math.max(0, Math.floor(offset));
  
  // 使用 query() 而不是 execute() 來避免 LIMIT/OFFSET 參數類型問題
  const finalParams = params ? normalizeParams(params) : [];
  const fullSql = `${sql} LIMIT ${safeLimit} OFFSET ${safeOffset}`;
  
  // 記錄查询開始時間
  const startTime = Date.now();
  
  if (process.env.NODE_ENV === 'development') {
    console.log('执行分页查询 - SQL:', fullSql.substring(0, 150));
    console.log('參數:', finalParams);
  }
  
  try {
    const [rows] = await getPool().query(fullSql, finalParams);
    const duration = Date.now() - startTime;
    
    // 記錄慢查询
    if (duration > SLOW_QUERY_THRESHOLD) {
      console.warn(`⚠️  慢查询 (${duration}ms):`, fullSql.substring(0, 150));
      console.warn('   參數:', finalParams);
    }
    
    return rows as T[];
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ 分页查询失敗 (${duration}ms):`, fullSql.substring(0, 100));
    console.error('   參數:', finalParams);
    throw error;
  }
}

/**
 * 执行单条查询
 * 
 * @param sql SQL 語句
 * @param params 查询參數
 * @param useCache 是否使用缓存（默认 false）
 * 
 * @example
 * const user = await queryOne<User>('SELECT * FROM users WHERE id = ?', [1]);
 * if (user) {
 *   console.log(user.name);
 * }
 */
export async function queryOne<T = any>(sql: string, params?: any[], useCache = false): Promise<T | null> {
  const rows = await query<T>(sql, params, useCache);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 执行插入并返回插入的 ID
 * 
 * 注意：执行插入操作後會自動清除相關缓存
 * 
 * @example
 * const id = await insert(
 *   'INSERT INTO users (name, email) VALUES (?, ?)',
 *   ['John', 'john@example.com']
 * );
 */
export async function insert(sql: string, params?: any[]): Promise<number> {
  const finalParams = params ? normalizeParams(params) : [];
  const startTime = Date.now();
  
  try {
    const [result] = await getPool().execute(sql, finalParams);
    const duration = Date.now() - startTime;
    const insertId = (result as mysql.ResultSetHeader).insertId;
    
    // 記錄慢查询
    if (duration > SLOW_QUERY_THRESHOLD) {
      console.warn(`⚠️  慢查询 (${duration}ms):`, sql.substring(0, 150));
      console.warn('   參數:', finalParams);
    }
    
    // 清除相關缓存（插入操作會影响數據）
    const tableMatch = sql.match(/INTO\s+(\w+)/i);
    if (tableMatch) {
      const tableName = tableMatch[1];
      clearQueryCache(tableName);
    }
    
    return insertId;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ 插入失敗 (${duration}ms):`, sql.substring(0, 100));
    console.error('   參數:', finalParams);
    throw error;
  }
}

/**
 * 执行更新/删除并返回影响的行數
 * 
 * 注意：执行更新/删除操作後會自動清除相關缓存
 * 
 * @example
 * const affected = await execute(
 *   'UPDATE users SET status = ? WHERE id = ?',
 *   ['active', 1]
 * );
 */
export async function execute(sql: string, params?: any[]): Promise<number> {
  const finalParams = params ? normalizeParams(params) : [];
  const startTime = Date.now();
  
  try {
    const [result] = await getPool().execute(sql, finalParams);
    const duration = Date.now() - startTime;
    const affectedRows = (result as mysql.ResultSetHeader).affectedRows;
    
    // 記錄慢查询
    if (duration > SLOW_QUERY_THRESHOLD) {
      console.warn(`⚠️  慢查询 (${duration}ms):`, sql.substring(0, 150));
      console.warn('   參數:', finalParams);
    }
    
    // 清除相關缓存（更新/删除操作會影响數據）
    if (affectedRows > 0) {
      // 根據表名清除缓存
      const tableMatch = sql.match(/FROM\s+(\w+)|UPDATE\s+(\w+)|INTO\s+(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1] || tableMatch[2] || tableMatch[3];
        clearQueryCache(tableName);
      }
    }
    
    return affectedRows;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ 执行失敗 (${duration}ms):`, sql.substring(0, 100));
    console.error('   參數:', finalParams);
    throw error;
  }
}

/**
 * 初始化數據庫（創建數據庫和表）
 */
export async function initDatabase(): Promise<void> {
  console.log('🗄️  初始化 MySQL 數據庫...');

  try {
    // 首先连接到 MySQL 服務器（不指定數據庫）
    const connectionWithoutDb = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    // 創建數據庫（如果不存在）
    await connectionWithoutDb.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ 數據庫 ${dbConfig.database} 已準備就绪`);
    await connectionWithoutDb.end();

    // 连接到指定數據庫
    const connection = await mysql.createConnection({
      ...dbConfig,
      database: dbConfig.database,
    });

    // 读取并执行 schema.sql
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // 分割并执行每个 SQL 語句
    const statements = schema
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      await connection.query(statement);
    }

    console.log('✅ 數據表創建成功');

    await connection.end();

    console.log('✅ 數據庫初始化完成');
    console.log('');
    console.log('數據庫配置:');
    console.log(`  主机: ${dbConfig.host}`);
    console.log(`  端口: ${dbConfig.port}`);
    console.log(`  數據庫: ${dbConfig.database}`);
    console.log(`  用户: ${dbConfig.user}`);
    console.log('');
    console.log('ℹ️  種子數據不會自動導入');
    console.log('   - 題目：请使用 AI 生成題目功能');
    console.log('   - 學校：如需導入，请調用 POST /api/data/seed-schools');
    console.log('   - 題目：如需導入，请調用 POST /api/data/seed-questions');
    console.log('');
  } catch (error) {
    console.error('❌ 數據庫初始化失敗:', error);
    throw error;
  }
}

/**
 * 获取數據庫統計信息
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
    console.error('获取統計信息失敗:', error);
    return { schools: 0, questions: 0, plans: 0, sessions: 0 };
  }
}

/**
 * 關闭數據庫连接池
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    console.log('✅ 數據庫连接池已關闭');
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
      console.error('❌ 初始化失敗:', error);
      process.exit(1);
    });
}
