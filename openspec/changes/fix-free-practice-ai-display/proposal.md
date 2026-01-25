# Change: 修復自由練習模式 AI 懸浮窗顯示和自動跳轉

## Why

當前系統中，自由練習模式創建會話時存在兩個問題：

1. **AI 懸浮窗未顯示**：自由練習模式在創建會話時，後端會自動檢查題目數量，如果不足會調用 AI 自動生成題目（通過 `ensureQuestionsAvailable` 函數）。但前端直接調用 `api.sessions.create`，沒有使用 `executeWithThinking` 包裝，導致用戶無法看到 AI 思考過程，體驗不一致。

2. **生成完成後未自動跳轉**：當 AI 生成題目完成後，前端只是設置了狀態並顯示成功消息，但沒有確保題目加載完成後自動跳轉到練習頁面，用戶需要手動操作。

根據項目規範（`openspec/project.md` 第 11 條），所有 AI 調用頁面必須使用通用懸浮框組件。自由練習模式作為重要的練習入口，應該與其他模式（如學校輪次模擬面試、弱點專項練習）保持一致，都應該顯示 AI 思考過程。

## What Changes

- **修改自由練習模式創建會話邏輯**：將 `api.sessions.create` 調用包裝在 `executeWithThinking` 中，確保當後端自動生成題目時，前端能顯示 AI 思考過程
- **添加自動跳轉邏輯**：在 AI 生成題目完成後，確保題目加載完成，然後自動跳轉到練習頁面（設置 `setStep('practice')`）
- **統一用戶體驗**：使自由練習模式與其他練習模式（學校輪次模擬、弱點專項練習）保持一致，都使用 AI 懸浮窗展示思考過程

## Impact

- **Affected specs**: 
  - 修改 `interview-practice` capability（自由練習模式相關需求）
  - 可能影響 `ai-thinking-display` capability（確保所有 AI 調用都使用浮窗）
- **Affected code**: 
  - 前端：`frontend/src/pages/Practice/index.tsx` 中的 `startPractice` 函數（自由練習模式部分）
  - 確保與其他模式（`startSchoolRoundPractice`、`startWeaknessPractice`）的實現保持一致
