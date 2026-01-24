# Change: 重构 MySQL 访问层并修复查询错误

## Why

当前 MySQL 访问代码存在以下问题：
1. **SQL 参数类型错误**：在分页查询中，`parseInt()` 返回的 number 类型直接传入 SQL 参数，导致 MySQL 报错 "Incorrect arguments to mysqld_stmt_execute"
2. **缺乏统一规范**：数据库查询散落在路由层，缺少统一的查询构建器和参数验证
3. **类型不安全**：泛型使用不当，返回类型推断不准确
4. **错误处理不一致**：部分查询缺少完善的错误处理

这些问题导致学校列表和题库 API 无法正常访问。

## What Changes

- **修复 SQL 参数类型问题**：确保分页参数 LIMIT/OFFSET 以正确类型传递给 MySQL prepared statement
- **建立查询规范**：定义统一的查询参数处理规范和最佳实践
- **优化数据库访问层**：改进 `db/index.ts` 中的查询函数，增加参数类型验证
- **修复路由层 bug**：修正 `routes/questions.ts` 和 `routes/schools.ts` 中的查询错误
- **添加日志规范**：统一查询日志格式，便于调试

## Impact

- 影响的能力：
  - `question-bank`：题库管理功能
  - `school-profiles`：学校档案功能
- 影响的代码：
  - `backend/src/db/index.ts`：数据库访问核心函数
  - `backend/src/routes/questions.ts`：题库路由
  - `backend/src/routes/schools.ts`：学校档案路由
- **BREAKING**: 无破坏性变更，仅修复 bug 和优化代码规范
