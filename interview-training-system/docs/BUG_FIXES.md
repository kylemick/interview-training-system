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

---

## 🔄 更新的文件

### 修复提交：
- `1d69b28` - fix: 修正 DeepSeek API 导出和使用
- `4dd4e00` - fix: 修正 schools.ts 导入路径错误  
- `076658f` - fix: 修正 questions.ts 中的命名冲突

### 受影响文件：
```
backend/src/
├── ai/
│   ├── deepseek.ts           # 导出 DeepSeekClient 类
│   └── questionGenerator.ts  # 使用 deepseekClient 实例
└── db/seeds/
    ├── schools.ts            # 修正导入路径
    └── questions.ts          # 重命名数据数组
```

---

## 📊 当前状态

✅ **所有数据库访问问题已修复**
✅ **后端服务可正常启动**
✅ **种子数据可正确导入**
✅ **API 端点可正常访问**

下一步：继续实现训练计划生成功能（Task 2.3）
