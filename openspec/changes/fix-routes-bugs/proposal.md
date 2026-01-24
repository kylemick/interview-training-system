# Change: 修复路由层 bug 并增强错误处理

## Why

代码审查发现多个路由文件存在问题：
1. **语法错误**：`routes/plans.ts` 第37行缺少逗号导致编译失败
2. **JSON 解析不健壮**：多个路由的 JSON 字段解析缺少 try-catch 错误处理
3. **分页查询不规范**：部分路由直接使用 LIMIT 参数可能遇到类型问题

这些问题导致：
- 服务器无法启动（语法错误）
- JSON 解析失败时整个请求崩溃
- 代码不一致，维护困难

## What Changes

- **修复 plans.ts 语法错误**：添加缺失的逗号
- **统一使用 queryWithPagination()**：所有分页查询使用专用函数
- **增强 JSON 解析错误处理**：所有 JSON 字段添加 try-catch
- **改进日志记录**：JSON 解析失败时记录警告信息

## Impact

- 影响的能力：
  - `training-plans`：训练计划功能
  - `interview-practice`：练习会话功能
  - `ai-feedback`：反馈生成功能
- 影响的代码：
  - `backend/src/routes/plans.ts`：修复语法错误和 JSON 解析
  - `backend/src/routes/sessions.ts`：改进分页和 JSON 解析
  - `backend/src/routes/feedback.ts`：改进分页和 JSON 解析
- **BREAKING**: 无破坏性变更
