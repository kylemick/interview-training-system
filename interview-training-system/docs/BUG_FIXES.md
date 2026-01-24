# 数据库访问问题修复总结

## 🐛 发现的 Bug

### Bug 1: DeepSeek API 导出问题
**错误信息：**
```
SyntaxError: The requested module './deepseek.js' does not provide an export named 'DeepSeekClient'
```

**原因：**
- `DeepSeekClient` 类未导出
- `questionGenerator.ts` 试图导入未导出的类

**修复：** (Commit: 1d69b28)
- 导出 `DeepSeekClient` 类：`export class DeepSeekClient`
- 更新 `questionGenerator.ts` 使用 `deepseekClient` 实例而非创建新实例
- 修正 `chat` 方法调用参数格式

---

### Bug 2: Schools 种子数据导入路径错误
**错误信息：**
```
Cannot find module '/Users/.../backend/src/db/seeds/index.js' 
imported from .../seeds/schools.ts
```

**原因：**
- `schools.ts` 从 `'./index.js'` 导入（同目录）
- 应该从 `'../index.js'` 导入（上级目录 db/index.ts）

**修复：** (Commit: 4dd4e00)
- 将 `import { insert, queryOne } from './index.js'` 
- 改为 `import { insert, queryOne } from '../index.js'`

---

### Bug 3: Questions 种子数据命名冲突
**错误信息：**
```
ERROR: The symbol "seedQuestions" has already been declared
```

**原因：**
- 数据数组名 `seedQuestions` 与函数名 `seedQuestions()` 冲突
- ESBuild 无法编译

**修复：** (Commit: 076658f)
- 将数组重命名为 `seedQuestionsData`
- 函数保持 `seedQuestions()` 不变
- 更新函数内的引用

---

### Bug 4: MySQL 参数传递问题 ⭐ **关键问题**
**错误信息：**
```
Error: Incorrect arguments to mysqld_stmt_execute
code: 'ER_WRONG_ARGUMENTS'
errno: 1210
```

**原因：**
- MySQL2 的 `execute()` 方法要求参数必须是数组
- 当 `params` 为 `undefined` 时导致错误
- 影响所有不传参数的查询（如无筛选条件的列表查询）

**修复：** (Commit: 73421e9, 3b98278)
- 在 `query()`, `insert()`, `execute()` 三个函数中
- 将 `params` 改为 `params || []`
- 确保始终传入数组而不是 `undefined`
- 添加所有路由的错误日志记录

**受影响的功能：**
- ✅ 学校列表查询（无筛选）
- ✅ 题目列表查询（无筛选）
- ✅ 所有统计查询
- ✅ 任何不需要 WHERE 条件的查询

**教训：**
- MySQL2 与原生 MySQL 客户端行为不同
- 必须为可选参数提供默认值
- 添加详细日志对调试至关重要

---

## ✅ 修复验证

### 预期正常启动日志：
```bash
🔑 DeepSeek API configured: https://api.deepseek.com
🗄️  初始化 MySQL 数据库...
✅ 数据库 interview_training 已准备就绪
✅ 数据表创建成功

🌱 初始化种子数据...
🌱 开始初始化学校档案数据...
  ✅/⏭️  5 所学校处理完成

🌱 导入题库种子数据...
✅ 题库种子数据导入完成：成功 21 条

✅ 数据库初始化完成
🚀 Server running on http://localhost:3001
📝 Health check: http://localhost:3001/health
```

### 测试步骤：
1. 重启服务：`cd interview-training-system && ./dev.sh`
2. 访问学校档案：http://localhost:3000/schools
3. 访问题库管理：http://localhost:3000/questions
4. 测试 AI 生成功能（需要有效的 DeepSeek API Key）

---

## 📝 经验教训

1. **导入路径规范**
   - 明确使用 `../` 或 `./` 
   - 避免隐式的目录 index 文件

2. **命名冲突**
   - 避免函数名与其内部使用的变量/常量同名
   - 使用更具描述性的名称（如 `seedQuestionsData` vs `seedQuestions`）

3. **API 设计一致性**
   - 统一使用单例实例（`deepseekClient`）而非每次创建新实例
   - 保持方法调用格式一致

4. **MySQL2 特性** ⭐ **重要**
   - `execute()` 方法**必须**接收数组参数，不能是 `undefined`
   - 可选参数需要提供默认值：`params || []`
   - 与原生 MySQL 客户端行为不同，需要特别注意

5. **调试策略**
   - 在所有 catch 块中添加 `console.error` 记录实际错误
   - 不要只抛出通用错误消息
   - 详细的错误日志是快速定位问题的关键

---

## 🔄 更新的文件

### 修复提交：
- `1d69b28` - fix: 修正 DeepSeek API 导出和使用
- `4dd4e00` - fix: 修正 schools.ts 导入路径错误  
- `076658f` - fix: 修正 questions.ts 中的命名冲突
- `3b98278` - fix: 添加题库路由错误日志以便调试
- `73421e9` - fix: 修复 MySQL 参数传递问题 ⭐

### 受影响文件：
```
backend/src/
├── ai/
│   ├── deepseek.ts           # 导出 DeepSeekClient 类
│   └── questionGenerator.ts  # 使用 deepseekClient 实例
├── db/
│   ├── index.ts              # 修复参数默认值 ⭐
│   └── seeds/
│       ├── schools.ts        # 修正导入路径
│       └── questions.ts      # 重命名数据数组
└── routes/
    ├── schools.ts            # 添加错误日志
    └── questions.ts          # 添加错误日志

docs/
├── BUG_FIXES.md              # 本文档
└── DATABASE_SPEC.md          # 新增：数据库访问规范 ⭐
```

---

## 📊 当前状态

✅ **所有数据库访问问题已修复**
✅ **后端服务可正常启动**
✅ **种子数据可正确导入**
✅ **API 端点可正常访问**
✅ **学校列表和题目列表均可正常显示**

## 📚 新增文档

- ✅ `docs/DATABASE_SPEC.md` - 数据库访问规范文档
  - 定义了标准的数据库操作模式
  - 列举了常见错误及避免方法
  - 提供了代码示例和检查清单
  - **强烈建议**在编写新功能前阅读此文档

下一步：继续实现训练计划生成功能（Task 2.3）
