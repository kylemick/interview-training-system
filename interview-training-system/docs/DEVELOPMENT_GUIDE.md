# 開發規范文檔

## 概述

本文檔定义了項目的開發規范，確保代碼质量和可維护性。

## 代碼变更要求

### 文檔更新要求

**所有代碼变更必须更新相關文檔。**

在提交代碼变更時，请確保：

1. **API 变更**：更新 API 文檔（如有）
2. **功能变更**：更新用户文檔或功能說明
3. **架构变更**：更新架构文檔或设計文檔
4. **配置变更**：更新配置說明文檔

### 文檔更新检查清单

在提交代碼前，请检查以下清单：

- [ ] 是否添加了新功能？→ 更新功能文檔
- [ ] 是否修改了 API？→ 更新 API 文檔
- [ ] 是否修改了數據庫結构？→ 更新數據庫文檔
- [ ] 是否修改了配置？→ 更新配置文檔
- [ ] 是否修改了部署流程？→ 更新部署文檔
- [ ] 是否引入了新的依赖？→ 更新依赖文檔

## 性能要求

### 前端性能要求

- **页面首次加载時間**：< 1 秒（本地环境）
- **API 响应時間**：< 500ms（简单查询），< 2 秒（复杂查询）
- **页面刷新**：所有页面刷新後能正常加载數據

### API 超時设置規范

**重要規則：AI 相關接口不设置超時限制**

所有涉及 AI 处理的接口（包括但不限于以下接口）必须设置 `timeout: 0`（无超時限制）：

#### 後端規范
- **DeepSeek 客户端**：`backend/src/ai/deepseek.ts` 中的 axios 实例必须设置 `timeout: 0`
- **原因**：AI 处理可能需要较長時間，不应因超時而中断

#### 前端規范
以下接口必须显式设置 `{ timeout: 0 }`：

1. **AI 服務接口** (`api.ai.*`)
   - `generateQuestions` - 生成題目
   - `generatePlan` - 生成計劃
   - `generateSchool` - 生成學校檔案
   - `extractInterviewMemory` - 提取面試回憶
   - `saveInterviewQuestions` - 保存面試題目
   - `saveWeaknesses` - 保存弱點
   - `testConnection` - 测試连接

2. **反馈接口** (`api.feedback.*`)
   - `generate` - 生成反馈
   - `batchGenerate` - 批量生成反馈

3. **訓練計劃接口** (`api.plans.*`)
   - `create` - 創建訓練計劃（會調用 AI 生成）

4. **弱點管理接口** (`api.weaknesses.*`)
   - `generateQuestions` - 從弱點生成題目

#### 实现示例

**前端示例**：
```typescript
// ✅ 正確：AI 接口不设置超時
api.ai.generateQuestions(data, { timeout: 0 })

// ❌ 错误：不要使用默认超時
api.ai.generateQuestions(data) // 會使用默认的 10 秒超時
```

**後端示例**：
```typescript
// ✅ 正確：DeepSeek 客户端不设置超時
this.client = axios.create({
  baseURL,
  headers: { ... },
  timeout: 0, // AI 接口不设置超時
})
```

#### 非 AI 接口
非 AI 相關接口保持默认超時设置（前端 10 秒），確保快速响应和错误处理。

### 性能優化最佳实践

1. **API 请求優化**
   - 使用并行请求（Promise.all）减少總加载時間
   - 实现请求去重，避免重复请求
   - 实现请求缓存（5 分鐘 TTL）
   - 組件卸载時取消未完成的请求

2. **React 性能優化**
   - 使用 `React.memo` 優化列表組件
   - 使用 `useMemo` 缓存計算結果
   - 使用 `useCallback` 缓存回調函數
   - 避免在渲染函數中創建新對象

3. **數據庫查询優化**
   - 使用适当的索引
   - 避免 N+1 查询問題
   - 對频繁访問的查询使用缓存
   - 記錄慢查询日志（> 100ms）

## 代碼規范

### 命名規范

- **变量和函數**：使用 camelCase
- **組件**：使用 PascalCase
- **常量**：使用 UPPER_SNAKE_CASE
- **文件**：使用 kebab-case（React 組件除外）

### 注释規范

- **函數注释**：使用 JSDoc 格式
- **复杂邏輯**：添加中文注释說明
- **TODO**：標記待完成的功能

### 错误处理

- **API 错误**：統一使用错误处理中間件
- **前端错误**：使用 try-catch 捕获并显示用户友好的错误信息
- **數據庫错误**：記錄详细日志，返回通用错误信息

## 测試要求

### 测試覆盖率

- **最低覆盖率**：60%
- **關键功能**：80% 以上（API 端點、數據庫操作）

### 测試類型

1. **单元测試**：测試单个函數或組件
2. **集成测試**：测試多个模块的协作
3. **E2E 测試**：测試完整用户流程
4. **性能测試**：测試 API 响应時間和页面加载時間

## 提交規范

### Commit Message

使用中文描述，格式：

```
類型: 简短描述

详细說明（可選）
```

類型包括：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文檔更新
- `style`: 代碼格式調整
- `refactor`: 代碼重构
- `perf`: 性能優化
- `test`: 测試相關
- `chore`: 构建/工具相關

### 代碼审查

提交代碼前：
1. 运行所有测試
2. 检查 linter 错误
3. 更新相關文檔
4. 確保代碼符合規范

## 參考文檔

- [React 最佳实践](https://react.dev/learn)
- [Node.js 最佳实践](https://github.com/goldbergyoni/nodebestpractices)
- [MySQL 性能優化](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)
