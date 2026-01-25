# 數據庫访問問題修复總結

## 🐛 發现的 Bug

### Bug 1: DeepSeek API 導出問題
**错误信息：**
```
SyntaxError: The requested module './deepseek.js' does not provide an export named 'DeepSeekClient'
```

**原因：**
- `DeepSeekClient` 類未導出
- `questionGenerator.ts` 試图導入未導出的類

**修复：** (Commit: 1d69b28)
- 導出 `DeepSeekClient` 類：`export class DeepSeekClient`
- 更新 `questionGenerator.ts` 使用 `deepseekClient` 实例而非創建新实例
- 修正 `chat` 方法調用參數格式

---

### Bug 2: Schools 種子數據導入路径错误
**错误信息：**
```
Cannot find module '/Users/.../backend/src/db/seeds/index.js' 
imported from .../seeds/schools.ts
```

**原因：**
- `schools.ts` 從 `'./index.js'` 導入（同目錄）
- 应该從 `'../index.js'` 導入（上级目錄 db/index.ts）

**修复：** (Commit: 4dd4e00)
- 将 `import { insert, queryOne } from './index.js'` 
- 改为 `import { insert, queryOne } from '../index.js'`

---

### Bug 3: Questions 種子數據命名冲突
**错误信息：**
```
ERROR: The symbol "seedQuestions" has already been declared
```

**原因：**
- 數據數組名 `seedQuestions` 与函數名 `seedQuestions()` 冲突
- ESBuild 无法编译

**修复：** (Commit: 076658f)
- 将數組重命名为 `seedQuestionsData`
- 函數保持 `seedQuestions()` 不变
- 更新函數內的引用

---

### Bug 4: MySQL 參數傳递問題 ⭐ **關键問題**
**错误信息：**
```
Error: Incorrect arguments to mysqld_stmt_execute
code: 'ER_WRONG_ARGUMENTS'
errno: 1210
```

**原因：**
- MySQL2 的 `execute()` 方法要求參數必须是數組
- 当 `params` 为 `undefined` 時導致错误
- 影响所有不傳參數的查询（如无筛選条件的列表查询）

**修复：** (Commit: 73421e9, 3b98278)
- 在 `query()`, `insert()`, `execute()` 三个函數中
- 将 `params` 改为 `params || []`
- 確保始终傳入數組而不是 `undefined`
- 添加所有路由的错误日志記錄

**受影响的功能：**
- ✅ 學校列表查询（无筛選）
- ✅ 題目列表查询（无筛選）
- ✅ 所有統計查询
- ✅ 任何不需要 WHERE 条件的查询

**教訓：**
- MySQL2 与原生 MySQL 客户端行为不同
- 必须为可選參數提供默认值
- 添加详细日志對調試至關重要

---

## ✅ 修复验证

### 预期正常启動日志：
```bash
🔑 DeepSeek API configured: https://api.deepseek.com
🗄️  初始化 MySQL 數據庫...
✅ 數據庫 interview_training 已準備就绪
✅ 數據表創建成功

🌱 初始化種子數據...
🌱 開始初始化學校檔案數據...
  ✅/⏭️  5 所學校处理完成

🌱 導入題庫種子數據...
✅ 題庫種子數據導入完成：成功 21 条

✅ 數據庫初始化完成
🚀 Server running on http://localhost:3001
📝 Health check: http://localhost:3001/health
```

### 测試步骤：
1. 重启服務：`cd interview-training-system && ./dev.sh`
2. 访問學校檔案：http://localhost:3000/schools
3. 访問題庫管理：http://localhost:3000/questions
4. 测試 AI 生成功能（需要有效的 DeepSeek API Key）

---

## 📝 经验教訓

1. **導入路径規范**
   - 明確使用 `../` 或 `./` 
   - 避免隐式的目錄 index 文件

2. **命名冲突**
   - 避免函數名与其內部使用的变量/常量同名
   - 使用更具描述性的名称（如 `seedQuestionsData` vs `seedQuestions`）

3. **API 设計一致性**
   - 統一使用单例实例（`deepseekClient`）而非每次創建新实例
   - 保持方法調用格式一致

4. **MySQL2 特性** ⭐ **重要**
   - `execute()` 方法**必须**接收數組參數，不能是 `undefined`
   - 可選參數需要提供默认值：`params || []`
   - 与原生 MySQL 客户端行为不同，需要特別注意

5. **調試策略**
   - 在所有 catch 块中添加 `console.error` 記錄实际错误
   - 不要只抛出通用错误消息
   - 详细的错误日志是快速定位問題的關键

---

## 🔄 更新的文件

### 修复提交：
- `1d69b28` - fix: 修正 DeepSeek API 導出和使用
- `4dd4e00` - fix: 修正 schools.ts 導入路径错误  
- `076658f` - fix: 修正 questions.ts 中的命名冲突
- `3b98278` - fix: 添加題庫路由错误日志以便調試
- `73421e9` - fix: 修复 MySQL 參數傳递問題 ⭐

### 受影响文件：
```
backend/src/
├── ai/
│   ├── deepseek.ts           # 導出 DeepSeekClient 類
│   └── questionGenerator.ts  # 使用 deepseekClient 实例
├── db/
│   ├── index.ts              # 修复參數默认值 ⭐
│   └── seeds/
│       ├── schools.ts        # 修正導入路径
│       └── questions.ts      # 重命名數據數組
└── routes/
    ├── schools.ts            # 添加错误日志
    └── questions.ts          # 添加错误日志

docs/
├── BUG_FIXES.md              # 本文檔
└── DATABASE_SPEC.md          # 新增：數據庫访問規范 ⭐
```

---

## 📊 当前狀態

✅ **所有數據庫访問問題已修复**
✅ **後端服務可正常启動**
✅ **種子數據可正確導入**
✅ **API 端點可正常访問**
✅ **學校列表和題目列表均可正常显示**

## 📚 新增文檔

- ✅ `docs/DATABASE_SPEC.md` - 數據庫访問規范文檔
  - 定义了標準的數據庫操作模式
  - 列举了常见错误及避免方法
  - 提供了代碼示例和检查清单
  - **强烈建議**在编写新功能前阅读此文檔

下一步：继续实现訓練計劃生成功能（Task 2.3）
