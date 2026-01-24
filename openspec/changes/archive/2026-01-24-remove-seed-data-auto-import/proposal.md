# Change: 移除种子数据自动导入并清理重复题目

## Why
当前系统在启动时自动导入种子数据（学校和题目），导致：
1. **数据重复问题**：每次重启服务都可能导入重复数据，当前题库有严重重复（每题重复14次）
2. **不必要的自动化**：用户希望手动控制题目生成，不需要自动导入
3. **维护困难**：种子数据硬编码在代码中，难以管理和更新

用户需求：
- 题库不需要自动导入，让用户自己通过AI生成
- 清理现有的重复题目数据
- 保留手动导入API（如果需要时可以调用）

## What Changes
- **移除自动导入**：initDatabase() 不再自动调用 seedSchoolProfiles() 和 seedQuestions()
- **保留手动API**：/api/data/seed-schools 和 /api/data/seed-questions 保留作为手动触发入口
- **清理重复数据**：删除数据库中的重复题目，每个题目只保留一条
- **更新文档**：说明用户应通过AI生成题目而不是依赖种子数据

**BREAKING**: 无（功能变更，不影响API）

## Impact
- 受影响的规范：question-bank
- 受影响的代码：
  - `backend/src/db/index.ts` - 移除 initDatabase() 中的种子数据调用
  - 数据库数据 - 清理重复题目
- 保留不变：
  - `backend/src/routes/data.ts` - 手动导入API保持可用
  - `backend/src/db/seeds/` - 种子数据文件保留作为参考
