# Change: 重构 MySQL 访問层并修复查询错误

## Why

当前 MySQL 访問代碼存在以下問題：
1. **SQL 參數類型错误**：在分页查询中，`parseInt()` 返回的 number 類型直接傳入 SQL 參數，導致 MySQL 报错 "Incorrect arguments to mysqld_stmt_execute"
2. **缺乏統一規范**：數據庫查询散落在路由层，缺少統一的查询构建器和參數验证
3. **類型不安全**：泛型使用不当，返回類型推断不準確
4. **错误处理不一致**：部分查询缺少完善的错误处理

这些問題導致學校列表和題庫 API 无法正常访問。

## What Changes

- **修复 SQL 參數類型問題**：確保分页參數 LIMIT/OFFSET 以正確類型傳递给 MySQL prepared statement
- **建立查询規范**：定义統一的查询參數处理規范和最佳实践
- **優化數據庫访問层**：改進 `db/index.ts` 中的查询函數，增加參數類型验证
- **修复路由层 bug**：修正 `routes/questions.ts` 和 `routes/schools.ts` 中的查询错误
- **添加日志規范**：統一查询日志格式，便于調試

## Impact

- 影响的能力：
  - `question-bank`：題庫管理功能
  - `school-profiles`：學校檔案功能
- 影响的代碼：
  - `backend/src/db/index.ts`：數據庫访問核心函數
  - `backend/src/routes/questions.ts`：題庫路由
  - `backend/src/routes/schools.ts`：學校檔案路由
- **BREAKING**: 无破坏性变更，仅修复 bug 和優化代碼規范
