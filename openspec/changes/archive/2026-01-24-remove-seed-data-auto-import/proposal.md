# Change: 移除種子數據自動導入并清理重复題目

## Why
当前係統在启動時自動導入種子數據（學校和題目），導致：
1. **數據重复問題**：每次重启服務都可能導入重复數據，当前題庫有嚴重重复（每題重复14次）
2. **不必要的自動化**：用户希望手動控制題目生成，不需要自動導入
3. **維护困難**：種子數據硬编碼在代碼中，難以管理和更新

用户需求：
- 題庫不需要自動導入，让用户自己通過AI生成
- 清理现有的重复題目數據
- 保留手動導入API（如果需要時可以調用）

## What Changes
- **移除自動導入**：initDatabase() 不再自動調用 seedSchoolProfiles() 和 seedQuestions()
- **保留手動API**：/api/data/seed-schools 和 /api/data/seed-questions 保留作为手動触發入口
- **清理重复數據**：删除數據庫中的重复題目，每个題目只保留一条
- **更新文檔**：說明用户应通過AI生成題目而不是依赖種子數據

**BREAKING**: 无（功能变更，不影响API）

## Impact
- 受影响的規范：question-bank
- 受影响的代碼：
  - `backend/src/db/index.ts` - 移除 initDatabase() 中的種子數據調用
  - 數據庫數據 - 清理重复題目
- 保留不变：
  - `backend/src/routes/data.ts` - 手動導入API保持可用
  - `backend/src/db/seeds/` - 種子數據文件保留作为參考
