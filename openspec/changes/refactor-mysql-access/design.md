# 设計文檔：MySQL 访問层重构

## Context

当前係統使用 MySQL2 作为數據庫驱動，通過 Promise Pool 执行 prepared statements。問題出现在将 JavaScript number 類型傳递给 SQL LIMIT/OFFSET 參數時，MySQL2 驱動期望接收特定類型的參數。

根據错误日志：
```
ER_WRONG_ARGUMENTS: Incorrect arguments to mysqld_stmt_execute
sql: 'LIMIT ? OFFSET ?'
```

这表明在 `questions.ts:69` 行，`parseInt(limit)` 和 `parseInt(offset)` 返回的 number 類型没有被正確处理。

## Goals / Non-Goals

**Goals:**
- 修复所有 SQL 參數類型相關的 bug
- 建立清晰的數據庫查询規范
- 提升代碼類型安全性和可維护性
- 確保所有 API 端點正常工作

**Non-Goals:**
- 引入 ORM（如 Prisma、TypeORM），保持轻量级
- 重写整个數據庫层架构
- 添加查询缓存或性能優化（留待後续）

## Decisions

### 决策 1：參數類型处理策略

**選擇：在傳递给 MySQL2 前，将所有 number 類型參數转为字符串**

原因：
- MySQL2 的 prepared statement 對于 LIMIT/OFFSET 參數的類型要求较嚴格
- 字符串形式的數字在 MySQL 中會自動转换，更兼容
- 简单直接，无需修改驱動层

替代方案：
- 使用 `pool.query()` 代替 `pool.execute()`：但失去了 prepared statement 的性能優勢和 SQL 注入防护
- 升级/降级 MySQL2 版本：可能引入其他不兼容問題

### 决策 2：查询參數验证层级

**選擇：在路由层（routes/*.ts）進行业務验证，在數據庫层（db/index.ts）進行類型規范化**

原因：
- 關注點分离：路由层负责业務規則，數據庫层负责技術细节
- 复用性：數據庫层的規范化邏輯可被所有路由复用
- 可测試性：每层职责明確，易于单元测試

### 决策 3：日志規范

**選擇：在 `query()` 函數中統一記錄 SQL、參數和類型信息**

原因：
- 便于調試和排查問題
- 集中管理，避免在各处重复添加日志
- 可通過环境变量控制日志详细程度

## Risks / Trade-offs

### 風险 1：參數转字符串可能掩盖類型错误

**缓解措施**：
- 在路由层先用 `parseInt()` 验证參數是有效數字
- 添加单元测試覆盖边界情况（负數、非數字、超大數等）

### 風险 2：现有代碼可能有其他隐藏的參數類型問題

**缓解措施**：
- 係統性检查所有 `query()` 調用點
- 在數據庫层添加通用的參數類型检查

## Migration Plan

无需數據庫迁移。代碼变更步骤：

1. **立即修复 critical bug**：
   - 修改 `routes/questions.ts:69` 行，将 `parseInt(limit)` 和 `parseInt(offset)` 转为字符串
   - 快速验证 API 恢复正常

2. **改進數據庫层**：
   - 在 `db/index.ts` 添加 `normalizeParams()` 辅助函數
   - 在 `query()` 函數中調用，自動处理參數類型

3. **規范化路由层**：
   - 检查所有路由文件，統一參數验证和類型转换邏輯
   - 添加代碼注释和使用示例

4. **测試验证**：
   - 手動测試所有受影响的 API
   - 添加自動化测試（如果時間允许）

**Rollback**：
- Git revert 即可回滚，无數據庫狀態变更

## Open Questions

- 是否需要在 `db/index.ts` 添加查询构建器函數（如 `buildWhereClause()`）？
  - 当前建議：不急于抽象，先修复問題，後续根據实际需求優化

- 是否应该限制 LIMIT 的最大值（如 1000）防止大查询？
  - 建議：在路由层添加，默认最大 100，可通過查询參數調整但不超過 1000
