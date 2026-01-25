# 數據庫访問規范 (Database Access Specification)

## 📋 概述

本文檔定义了項目中 MySQL 數據庫访問的標準規范，確保代碼一致性和避免常见错误。

---

## 🔧 數據庫连接

### 连接池配置

```typescript
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
```

### 连接池获取

```typescript
export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}
```

---

## 📝 數據庫操作函數

### 1. 查询函數 (query)

**用途：** 执行 SELECT 查询，返回多条記錄

**籤名：**
```typescript
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]>
```

**重要規范：**
- ✅ **必须**将 `params` 默认为空數組：`params || []`
- ✅ 使用 `pool.execute()` 而不是 `pool.query()` （支持预处理語句）
- ✅ 返回類型为數組 `T[]`

**示例：**
```typescript
// 无參數查询
const schools = await query('SELECT * FROM school_profiles');

// 带參數查询
const schools = await query(
  'SELECT * FROM school_profiles WHERE code = ?',
  ['SPCC']
);

// 带多个參數
const questions = await query(
  'SELECT * FROM questions WHERE category = ? AND difficulty = ? LIMIT ? OFFSET ?',
  ['english-oral', 'easy', 50, 0]
);
```

---

### 2. 单条查询函數 (queryOne)

**用途：** 执行 SELECT 查询，返回单条記錄或 null

**籤名：**
```typescript
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>
```

**重要規范：**
- ✅ 內部調用 `query()`
- ✅ 返回第一条記錄或 `null`
- ✅ 适用于根據主键或唯一键查询

**示例：**
```typescript
// 根據主键查询
const school = await queryOne(
  'SELECT * FROM school_profiles WHERE id = ?',
  [1]
);

if (!school) {
  throw new AppError(404, '學校不存在');
}

// 根據唯一代碼查询
const school = await queryOne(
  'SELECT * FROM school_profiles WHERE code = ?',
  ['SPCC']
);
```

---

### 3. 插入函數 (insert)

**用途：** 执行 INSERT 語句，返回插入的 ID

**籤名：**
```typescript
export async function insert(sql: string, params?: any[]): Promise<number>
```

**重要規范：**
- ✅ **必须**将 `params` 默认为空數組：`params || []`
- ✅ 返回 `insertId`（自增主键值）
- ✅ JSON 字段必须使用 `JSON.stringify()`

**示例：**
```typescript
// 插入學校
const schoolId = await insert(
  `INSERT INTO school_profiles (code, name, name_zh, focus_areas, interview_style, notes)
   VALUES (?, ?, ?, ?, ?, ?)`,
  ['SPCC', "St. Paul's Co-educational College", '聖保羅男女中學',
   JSON.stringify(['critical-thinking', 'english-oral']),
   'academic-rigorous', '注重批判性思維']
);

// 插入題目
const questionId = await insert(
  `INSERT INTO questions (category, question_text, difficulty, tags, source)
   VALUES (?, ?, ?, ?, ?)`,
  ['english-oral', 'Introduce yourself', 'easy',
   JSON.stringify(['self-intro']), 'manual']
);
```

---

### 4. 更新/删除函數 (execute)

**用途：** 执行 UPDATE 或 DELETE 語句，返回受影响的行數

**籤名：**
```typescript
export async function execute(sql: string, params?: any[]): Promise<number>
```

**重要規范：**
- ✅ **必须**将 `params` 默认为空數組：`params || []`
- ✅ 返回 `affectedRows`
- ✅ 可用于检查操作是否成功（`affectedRows === 0` 表示没有匹配行）

**示例：**
```typescript
// 更新學校
const affectedRows = await execute(
  `UPDATE school_profiles
   SET name = ?, focus_areas = ?, updated_at = CURRENT_TIMESTAMP
   WHERE code = ?`,
  ['New Name', JSON.stringify(['area1']), 'SPCC']
);

if (affectedRows === 0) {
  throw new AppError(404, '學校不存在或无变化');
}

// 删除題目
const affectedRows = await execute(
  'DELETE FROM questions WHERE id = ?',
  [123]
);
```

---

## ⚠️ 常见错误及避免方法

### 错误 1: 參數傳递 undefined

**错误代碼：**
```typescript
// ❌ 错误：当没有參數時傳入 undefined
const schools = await query('SELECT * FROM school_profiles');
// MySQL2 错误: Incorrect arguments to mysqld_stmt_execute
```

**正確代碼：**
```typescript
// ✅ 正確：在函數內部处理 undefined
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params || []);  // 關键！
  return rows as T[];
}

// 調用時可以不傳參數
const schools = await query('SELECT * FROM school_profiles');
```

---

### 错误 2: JSON 字段未序列化

**错误代碼：**
```typescript
// ❌ 错误：直接傳入數組
await insert(
  'INSERT INTO questions (tags) VALUES (?)',
  [['tag1', 'tag2']]  // MySQL 會报错或存储错误
);
```

**正確代碼：**
```typescript
// ✅ 正確：使用 JSON.stringify()
await insert(
  'INSERT INTO questions (tags) VALUES (?)',
  [JSON.stringify(['tag1', 'tag2'])]
);
```

---

### 错误 3: JSON 字段未解析

**错误代碼：**
```typescript
// ❌ 错误：直接返回字符串
const question = await queryOne('SELECT * FROM questions WHERE id = ?', [1]);
console.log(question.tags);  // 输出: '["tag1","tag2"]' (字符串)
```

**正確代碼：**
```typescript
// ✅ 正確：解析 JSON 字段
const question = await queryOne('SELECT * FROM questions WHERE id = ?', [1]);
const parsedQuestion = {
  ...question,
  tags: typeof question.tags === 'string' 
    ? JSON.parse(question.tags) 
    : question.tags,
};
console.log(parsedQuestion.tags);  // 输出: ['tag1', 'tag2'] (數組)
```

---

### 错误 4: 導入路径错误

**错误代碼：**
```typescript
// ❌ 错误：從同目錄導入
// 文件: src/db/seeds/schools.ts
import { insert } from './index.js';  // 試图從 seeds/index.js 導入
```

**正確代碼：**
```typescript
// ✅ 正確：從上级目錄導入
// 文件: src/db/seeds/schools.ts
import { insert } from '../index.js';  // 從 db/index.js 導入
```

---

## 🎯 最佳实践

### 1. 错误处理

**始终記錄详细错误信息：**
```typescript
try {
  const schools = await query('SELECT * FROM school_profiles');
  res.json({ success: true, data: schools });
} catch (error) {
  console.error('获取學校列表失敗:', error);  // 關键！記錄实际错误
  throw new AppError(500, '获取學校列表失敗');
}
```

### 2. 參數化查询

**始终使用參數化查询，避免 SQL 注入：**
```typescript
// ❌ 危险：字符串拼接
const schools = await query(`SELECT * FROM schools WHERE code = '${code}'`);

// ✅ 安全：參數化查询
const schools = await query('SELECT * FROM schools WHERE code = ?', [code]);
```

### 3. 事務处理

**對于需要原子性的操作，使用事務：**
```typescript
const connection = await getPool().getConnection();
try {
  await connection.beginTransaction();
  
  const schoolId = await connection.execute(
    'INSERT INTO school_profiles (...) VALUES (...)',
    [...]
  );
  
  await connection.execute(
    'INSERT INTO questions (school_code, ...) VALUES (?, ...)',
    [schoolCode, ...]
  );
  
  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
}
```

### 4. 類型安全

**使用 TypeScript 泛型確保類型安全：**
```typescript
interface School {
  id: number;
  code: string;
  name: string;
  focus_areas: string[];
}

const schools = await query<School>(
  'SELECT * FROM school_profiles WHERE code = ?',
  ['SPCC']
);

// schools 的類型为 School[]
```

---

## 📚 參考資料

- [MySQL2 文檔](https://github.com/sidorares/node-mysql2)
- [TypeScript 類型定义](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- 項目 Bug 修复記錄: `docs/BUG_FIXES.md`

---

## ✅ 检查清单

在编写數據庫访問代碼時，请確保：

- [ ] 所有數據庫函數都将 `params` 默认为空數組 (`params || []`)
- [ ] JSON 字段在插入時使用 `JSON.stringify()`
- [ ] JSON 字段在查询後進行 `JSON.parse()`
- [ ] 使用參數化查询，避免 SQL 注入
- [ ] 添加详细的错误日志 (`console.error`)
- [ ] 導入路径使用显式的 `../` 或 `./`
- [ ] 检查 `affectedRows` 或 `insertId` 以验证操作成功
- [ ] 對關键操作使用事務保证原子性

---

**版本：** 1.0  
**最後更新：** 2026-01-25  
**維护者：** 開發团队
