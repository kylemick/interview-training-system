# 任务清单

## 1. 代码审查和问题诊断
- [x] 1.1 检查所有路由文件的语法错误
- [x] 1.2 识别 JSON 解析的潜在问题
- [x] 1.3 检查分页查询的实现

## 2. 修复 plans.ts
- [x] 2.1 修复第37行缺少逗号的语法错误
- [x] 2.2 改进 category_allocation JSON 解析（4处）
- [x] 2.3 改进 question_ids JSON 解析（2处）
- [x] 2.4 添加错误处理和日志

## 3. 修复 sessions.ts
- [x] 3.1 导入 queryWithPagination 函数
- [x] 3.2 改进 ai_feedback JSON 解析
- [x] 3.3 使用 queryWithPagination 处理分页查询
- [x] 3.4 添加参数验证

## 4. 修复 feedback.ts
- [x] 4.1 导入 queryWithPagination 函数
- [x] 4.2 改进 strengths/weaknesses JSON 解析（2处）
- [x] 4.3 使用 queryWithPagination 处理分页查询
- [x] 4.4 添加错误处理和日志

## 5. 测试和验证
- [x] 5.1 TypeScript 编译检查
- [x] 5.2 启动服务器测试
- [x] 5.3 测试学校列表 API
- [x] 5.4 测试题库列表 API
- [x] 5.5 测试题库统计 API

## 6. 文档和提交
- [x] 6.1 创建 OpenSpec 变更提案
- [x] 6.2 更新相关 spec 文件
- [x] 6.3 提交代码到 git
- [x] 6.4 推送到远程仓库
