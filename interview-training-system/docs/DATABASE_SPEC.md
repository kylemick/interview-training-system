# 数据库访问规范 (Database Access Specification)

## 📋 概述

本文档定义了项目中 MySQL 数据库访问的标准规范，确保代码一致性和避免常见错误。

---

## 🔧 数据库连接

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

## 📝 数据库操作函数

### 1. 查询函数 (query)

**用途：** 执行 SELECT 查询，返回多条记录

**签名：**
```typescript
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]>
```

**重要规范：**
- ✅ **必须**将 `params` 默认为空数组：`params || []`
- ✅ 使用 `pool.execute()` 而不是 `pool.query()` （支持预处理语句）
- ✅ 返回类型为数组 `T[]`

**示例：**
```typescript
// 无参数查询
const schools = await query('SELECT * FROM school_profiles');

// 带参数查询
const schools = await query(
  'SELECT * FROM school_profiles WHERE code = ?',
  ['SPCC']
);

// 带多个参数
const questions = await query(
  'SELECT * FROM questions WHERE category = ? AND difficulty = ? LIMIT ? OFFSET ?',
  ['english-oral', 'easy', 50, 0]
);
```

---

### 2. 单条查询函数 (queryOne)

**用途：** 执行 SELECT 查询，返回单条记录或 null

**签名：**
```typescript
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>
```

**重要规范：**
- ✅ 内部调用 `query()`
- ✅ 返回第一条记录或 `null`
- ✅ 适用于根据主键或唯一键查询

**示例：**
```typescript
// 根据主键查询
const school = await queryOne(
  'SELECT * FROM school_profiles WHERE id = ?',
  [1]
);

if (!school) {
  throw new AppError(404, '学校不存在');
}

// 根据唯一代码查询
const school = await queryOne(
  'SELECT * FROM school_profiles WHERE code = ?',
  ['SPCC']
);
```

---

### 3. 插入函数 (insert)

**用途：** 执行 INSERT 语句，返回插入的 ID

**签名：**
```typescript
export async function insert(sql: string, params?: any[]): Promise<number>
```

**重要规范：**
- ✅ **必须**将 `params` 默认为空数组：`params || []`
- ✅ 返回 `insertId`（自增主键值）
- ✅ JSON 字段必须使用 `JSON.stringify()`

**示例：**
```typescript
// 插入学校
const schoolId = await insert(
  `INSERT INTO school_profiles (code, name, name_zh, focus_areas, interview_style, notes)
   VALUES (?, ?, ?, ?, ?, ?)`,
  ['SPCC', "St. Paul's Co-educational College", '圣保罗男女中学',
   JSON.stringify(['critical-thinking', 'english-oral']),
   'academic-rigorous', '注重批判性思维']
);

// 插入题目
const questionId = await insert(
  `INSERT INTO questions (category, question_text, difficulty, tags, source)
   VALUES (?, ?, ?, ?, ?)`,
  ['english-oral', 'Introduce yourself', 'easy',
   JSON.stringify(['self-intro']), 'manual']
);
```

---

### 4. 更新/删除函数 (execute)

**用途：** 执行 UPDATE 或 DELETE 语句，返回受影响的行数

**签名：**
```typescript
export async function execute(sql: string, params?: any[]): Promise<number>
```

**重要规范：**
- ✅ **必须**将 `params` 默认为空数组：`params || []`
- ✅ 返回 `affectedRows`
- ✅ 可用于检查操作是否成功（`affectedRows === 0` 表示没有匹配行）

**示例：**
```typescript
// 更新学校
const affectedRows = await execute(
  `UPDATE school_profiles
   SET name = ?, focus_areas = ?, updated_at = CURRENT_TIMESTAMP
   WHERE code = ?`,
  ['New Name', JSON.stringify(['area1']), 'SPCC']
);

if (affectedRows === 0) {
  throw new AppError(404, '学校不存在或无变化');
}

// 删除题目
const affectedRows = await execute(
  'DELETE FROM questions WHERE id = ?',
  [123]
);
```

---

## ⚠️ 常见错误及避免方法

### 错误 1: 参数传递 undefined

**错误代码：**
```typescript
// ❌ 错误：当没有参数时传入 undefined
const schools = await query('SELECT * FROM school_profiles');
// MySQL2 错误: Incorrect arguments to mysqld_stmt_execute
```

**正确代码：**
```typescript
// ✅ 正确：在函数内部处理 undefined
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params || []);  // 关键！
  return rows as T[];
}

// 调用时可以不传参数
const schools = await query('SELECT * FROM school_profiles');
```

---

### 错误 2: JSON 字段未序列化

**错误代码：**
```typescript
// ❌ 错误：直接传入数组
await insert(
  'INSERT INTO questions (tags) VALUES (?)',
  [['tag1', 'tag2']]  // MySQL 会报错或存储错误
);
```

**正确代码：**
```typescript
// ✅ 正确：使用 JSON.stringify()
await insert(
  'INSERT INTO questions (tags) VALUES (?)',
  [JSON.stringify(['tag1', 'tag2'])]
);
```

---

### 错误 3: JSON 字段未解析

**错误代码：**
```typescript
// ❌ 错误：直接返回字符串
const question = await queryOne('SELECT * FROM questions WHERE id = ?', [1]);
console.log(question.tags);  // 输出: '["tag1","tag2"]' (字符串)
```

**正确代码：**
```typescript
// ✅ 正确：解析 JSON 字段
const question = await queryOne('SELECT * FROM questions WHERE id = ?', [1]);
const parsedQuestion = {
  ...question,
  tags: typeof question.tags === 'string' 
    ? JSON.parse(question.tags) 
    : question.tags,
};
console.log(parsedQuestion.tags);  // 输出: ['tag1', 'tag2'] (数组)
```

---

### 错误 4: 导入路径错误

**错误代码：**
```typescript
// ❌ 错误：从同目录导入
// 文件: src/db/seeds/schools.ts
import { insert } from './index.js';  // 试图从 seeds/index.js 导入
```

**正确代码：**
```typescript
// ✅ 正确：从上级目录导入
// 文件: src/db/seeds/schools.ts
import { insert } from '../index.js';  // 从 db/index.js 导入
```

---

## 🎯 最佳实践

### 1. 错误处理

**始终记录详细错误信息：**
```typescript
try {
  const schools = await query('SELECT * FROM school_profiles');
  res.json({ success: true, data: schools });
} catch (error) {
  console.error('获取学校列表失败:', error);  // 关键！记录实际错误
  throw new AppError(500, '获取学校列表失败');
}
```

### 2. 参数化查询

**始终使用参数化查询，避免 SQL 注入：**
```typescript
// ❌ 危险：字符串拼接
const schools = await query(`SELECT * FROM schools WHERE code = '${code}'`);

// ✅ 安全：参数化查询
const schools = await query('SELECT * FROM schools WHERE code = ?', [code]);
```

### 3. 事务处理

**对于需要原子性的操作，使用事务：**
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

### 4. 类型安全

**使用 TypeScript 泛型确保类型安全：**
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

// schools 的类型为 School[]
```

---

## 📚 参考资料

- [MySQL2 文档](https://github.com/sidorares/node-mysql2)
- [TypeScript 类型定义](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- 项目 Bug 修复记录: `docs/BUG_FIXES.md`

---

## ✅ 检查清单

在编写数据库访问代码时，请确保：

- [ ] 所有数据库函数都将 `params` 默认为空数组 (`params || []`)
- [ ] JSON 字段在插入时使用 `JSON.stringify()`
- [ ] JSON 字段在查询后进行 `JSON.parse()`
- [ ] 使用参数化查询，避免 SQL 注入
- [ ] 添加详细的错误日志 (`console.error`)
- [ ] 导入路径使用显式的 `../` 或 `./`
- [ ] 检查 `affectedRows` 或 `insertId` 以验证操作成功
- [ ] 对关键操作使用事务保证原子性

---

**版本：** 1.0  
**最后更新：** 2026-01-25  
**维护者：** 开发团队
