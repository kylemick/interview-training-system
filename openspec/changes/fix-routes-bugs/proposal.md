# Change: 修复路由层 bug 并增强错误处理

## Why

代碼审查發现多个路由文件存在問題：
1. **語法错误**：`routes/plans.ts` 第37行缺少逗號導致编译失敗
2. **JSON 解析不健壮**：多个路由的 JSON 字段解析缺少 try-catch 错误处理
3. **分页查询不規范**：部分路由直接使用 LIMIT 參數可能遇到類型問題

这些問題導致：
- 服務器无法启動（語法错误）
- JSON 解析失敗時整个请求崩溃
- 代碼不一致，維护困難

## What Changes

- **修复 plans.ts 語法错误**：添加缺失的逗號
- **統一使用 queryWithPagination()**：所有分页查询使用專用函數
- **增强 JSON 解析错误处理**：所有 JSON 字段添加 try-catch
- **改進日志記錄**：JSON 解析失敗時記錄警告信息

## Impact

- 影响的能力：
  - `training-plans`：訓練計劃功能
  - `interview-practice`：練習會話功能
  - `ai-feedback`：反馈生成功能
- 影响的代碼：
  - `backend/src/routes/plans.ts`：修复語法错误和 JSON 解析
  - `backend/src/routes/sessions.ts`：改進分页和 JSON 解析
  - `backend/src/routes/feedback.ts`：改進分页和 JSON 解析
- **BREAKING**: 无破坏性变更
