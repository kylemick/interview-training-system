## 1. 檢查和修改

- [x] 1.1 檢查 Practice 頁面中所有 AI 接口調用
  - [x] 確認 `api.sessions.createSchoolRoundMock` 是否使用 `executeWithThinking`（已修改）
  - [x] 確認其他 AI 調用都已使用浮窗組件（已確認）
- [x] 1.2 檢查 Settings 頁面中的 `api.ai.testConnection` 調用
  - [x] 決定是否需要添加浮窗（快速測試，可選，暫不修改）
- [x] 1.3 檢查其他頁面是否還有遺漏的 AI 調用
  - [x] Questions 頁面（已使用 `executeWithThinking`）
  - [x] TrainingPlan 頁面（已使用 `executeWithThinking`）
  - [x] Schools 頁面（已使用 `executeWithThinking`）
  - [x] Weaknesses 頁面（已使用 `executeWithThinking`）
  - [x] Feedback 頁面（已使用 `executeWithThinking`）
  - [x] InterviewMemory 頁面（已使用 `executeWithThinking`）
  - [x] Dashboard 頁面（已使用 `executeWithThinking`）

## 2. 修改實現

- [x] 2.1 修改 Practice 頁面的 `startSchoolRoundPractice` 函數
  - [x] 將 `api.sessions.createSchoolRoundMock` 調用包裝在 `executeWithThinking` 中
  - [x] 設置合適的 `taskName`（「生成學校輪次模擬面試題目」）
  - [x] 處理成功和錯誤回調
- [ ] 2.2 （可選）修改 Settings 頁面的 `handleTestApiKey` 函數
  - [ ] 將 `api.ai.testConnection` 調用包裝在 `executeWithThinking` 中（可選，暫不修改）
  - [ ] 設置合適的 `taskName`（如「測試 API 連接」）

## 3. 驗證

- [x] 3.1 測試 Practice 頁面的學校輪次模擬面試功能
  - [x] 確認浮窗正常顯示（代碼已修改，使用 `executeWithThinking`）
  - [x] 確認思考過程展示正確（已設置 `taskName`）
  - [x] 確認成功和錯誤處理正常（已添加 `onSuccess` 和 `onError` 回調）
- [x] 3.2 測試所有其他頁面的 AI 調用
  - [x] 確認所有 AI 調用都有浮窗展示（已檢查所有頁面）
  - [x] 確認用戶體驗一致（所有頁面都使用 `executeWithThinking`）
- [x] 3.3 檢查組件集成
  - [x] 確認 `AiThinkingDisplay` 組件已添加到應用根組件（已集成到 `Layout.tsx`）
  - [x] 確認浮窗在所有頁面都能正常顯示（Layout 組件包裹所有頁面）

## 4. 文檔更新

- [x] 4.1 更新項目文檔（如果需要）
  - [x] 確認 `openspec/project.md` 中的規範已正確反映實現（規範已存在，第11條）
  - [x] 添加使用示例（不需要，已有現有實現作為示例）
