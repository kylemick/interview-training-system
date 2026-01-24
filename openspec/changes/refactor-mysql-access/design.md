# 设计文档：MySQL 访问层重构

## Context

当前系统使用 MySQL2 作为数据库驱动，通过 Promise Pool 执行 prepared statements。问题出现在将 JavaScript number 类型传递给 SQL LIMIT/OFFSET 参数时，MySQL2 驱动期望接收特定类型的参数。

根据错误日志：
```
ER_WRONG_ARGUMENTS: Incorrect arguments to mysqld_stmt_execute
sql: 'LIMIT ? OFFSET ?'
```

这表明在 `questions.ts:69` 行，`parseInt(limit)` 和 `parseInt(offset)` 返回的 number 类型没有被正确处理。

## Goals / Non-Goals

**Goals:**
- 修复所有 SQL 参数类型相关的 bug
- 建立清晰的数据库查询规范
- 提升代码类型安全性和可维护性
- 确保所有 API 端点正常工作

**Non-Goals:**
- 引入 ORM（如 Prisma、TypeORM），保持轻量级
- 重写整个数据库层架构
- 添加查询缓存或性能优化（留待后续）

## Decisions

### 决策 1：参数类型处理策略

**选择：在传递给 MySQL2 前，将所有 number 类型参数转为字符串**

原因：
- MySQL2 的 prepared statement 对于 LIMIT/OFFSET 参数的类型要求较严格
- 字符串形式的数字在 MySQL 中会自动转换，更兼容
- 简单直接，无需修改驱动层

替代方案：
- 使用 `pool.query()` 代替 `pool.execute()`：但失去了 prepared statement 的性能优势和 SQL 注入防护
- 升级/降级 MySQL2 版本：可能引入其他不兼容问题

### 决策 2：查询参数验证层级

**选择：在路由层（routes/*.ts）进行业务验证，在数据库层（db/index.ts）进行类型规范化**

原因：
- 关注点分离：路由层负责业务规则，数据库层负责技术细节
- 复用性：数据库层的规范化逻辑可被所有路由复用
- 可测试性：每层职责明确，易于单元测试

### 决策 3：日志规范

**选择：在 `query()` 函数中统一记录 SQL、参数和类型信息**

原因：
- 便于调试和排查问题
- 集中管理，避免在各处重复添加日志
- 可通过环境变量控制日志详细程度

## Risks / Trade-offs

### 风险 1：参数转字符串可能掩盖类型错误

**缓解措施**：
- 在路由层先用 `parseInt()` 验证参数是有效数字
- 添加单元测试覆盖边界情况（负数、非数字、超大数等）

### 风险 2：现有代码可能有其他隐藏的参数类型问题

**缓解措施**：
- 系统性检查所有 `query()` 调用点
- 在数据库层添加通用的参数类型检查

## Migration Plan

无需数据库迁移。代码变更步骤：

1. **立即修复 critical bug**：
   - 修改 `routes/questions.ts:69` 行，将 `parseInt(limit)` 和 `parseInt(offset)` 转为字符串
   - 快速验证 API 恢复正常

2. **改进数据库层**：
   - 在 `db/index.ts` 添加 `normalizeParams()` 辅助函数
   - 在 `query()` 函数中调用，自动处理参数类型

3. **规范化路由层**：
   - 检查所有路由文件，统一参数验证和类型转换逻辑
   - 添加代码注释和使用示例

4. **测试验证**：
   - 手动测试所有受影响的 API
   - 添加自动化测试（如果时间允许）

**Rollback**：
- Git revert 即可回滚，无数据库状态变更

## Open Questions

- 是否需要在 `db/index.ts` 添加查询构建器函数（如 `buildWhereClause()`）？
  - 当前建议：不急于抽象，先修复问题，后续根据实际需求优化

- 是否应该限制 LIMIT 的最大值（如 1000）防止大查询？
  - 建议：在路由层添加，默认最大 100，可通过查询参数调整但不超过 1000
