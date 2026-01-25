# Change: 統一所有AI接口調用使用浮窗組件

## Why

當前系統中，雖然已經實現了通用的 AI 思考展示浮窗組件（`AiThinkingDisplay`）和對應的 Hook（`useAiThinking`），但經過檢查發現：

1. **部分 AI 調用未使用浮窗**：某些頁面中的 AI 接口調用（如 `api.sessions.createSchoolRoundMock`）直接調用 API，沒有使用 `executeWithThinking` 包裝，導致用戶無法看到 AI 思考過程
2. **用戶體驗不一致**：部分功能有浮窗展示，部分沒有，造成交互體驗不統一
3. **規範要求**：根據 `openspec/project.md` 第 11 條規範，所有 AI 調用頁面必須使用通用懸浮框組件

通過統一所有 AI 接口調用都使用浮窗組件，可以：
- 確保所有 AI 調用都有清晰的視覺反饋
- 保持用戶體驗的一致性
- 符合項目規範要求

## What Changes

- **檢查並修改所有 AI 接口調用**：確保所有涉及 AI 的接口調用都使用 `executeWithThinking` 包裝
- **重點修改的頁面**：
  - Practice 頁面：`api.sessions.createSchoolRoundMock` 調用需要添加浮窗
  - Settings 頁面：`api.ai.testConnection` 調用可選添加浮窗（快速測試，可選）
- **確保組件集成**：所有頁面都必須在組件樹中包含 `AiThinkingDisplay` 組件（通常放在 App.tsx 或 Layout 中）

## Impact

- **Affected specs**: 
  - 修改 `ai-thinking-display` capability（如果已歸檔）
  - 可能影響 `interview-practice` capability
- **Affected code**: 
  - 前端：`frontend/src/pages/Practice/index.tsx`
  - 前端：`frontend/src/pages/Settings/index.tsx`（可選）
  - 前端：確保 `frontend/src/components/AiThinkingDisplay/index.tsx` 已集成到應用根組件
