## MODIFIED Requirements

### Requirement: AI思考過程展示組件使用規範
系統 SHALL 要求所有涉及 AI 調用的頁面使用通用的 `AiThinkingDisplay` 組件和 `useAiThinking` Hook 來展示 AI 思考過程。所有 AI 接口調用（包括但不限於生成題目、生成計劃、生成反饋、生成學校檔案、提取面試回憶、生成學習素材、創建模擬面試等）MUST 通過 `executeWithThinking` 函數包裝，確保用戶能夠看到 AI 的思考過程。

#### Scenario: 練習頁面創建學校輪次模擬面試
- **WHEN** 用戶在練習頁面選擇學校和輪次，點擊開始模擬面試
- **THEN** 系統調用 `api.sessions.createSchoolRoundMock` 時，必須使用 `executeWithThinking` 包裝
- **AND** 浮窗顯示「生成學校輪次模擬面試題目」任務
- **AND** 用戶可以看到 AI 思考步驟
- **AND** 生成完成後浮窗自動關閉

#### Scenario: 所有AI調用統一使用浮窗
- **WHEN** 用戶在任何頁面觸發 AI 相關操作（生成題目、生成計劃、生成反饋等）
- **THEN** 所有 AI 接口調用都必須通過 `executeWithThinking` 包裝
- **AND** 浮窗組件必須顯示在頁面上
- **AND** 思考過程必須清晰展示給用戶
- **AND** 成功或失敗後浮窗必須正確關閉

#### Scenario: 組件集成要求
- **WHEN** 應用啟動
- **THEN** `AiThinkingDisplay` 組件必須已集成到應用根組件（App.tsx 或 Layout 組件）
- **AND** 組件在所有頁面都可見（當有 AI 任務時）
- **AND** 組件支持最小化和關閉操作
