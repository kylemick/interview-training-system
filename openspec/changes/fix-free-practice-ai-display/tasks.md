## 1. 檢查和修改自由練習模式

- [x] 1.1 檢查 `startPractice` 函數中自由練習模式的實現
  - [x] 確認當前是否使用 `executeWithThinking`（應為否）
  - [x] 確認 `api.sessions.create` 調用的位置和參數
  - [x] 確認題目加載和跳轉邏輯

- [x] 1.2 檢查其他練習模式的實現作為參考
  - [x] 查看 `startSchoolRoundPractice` 如何使用 `executeWithThinking`
  - [x] 查看 `startWeaknessPractice` 如何使用 `executeWithThinking`
  - [x] 確認成功回調中的跳轉邏輯

## 2. 修改實現

- [x] 2.1 修改 `startPractice` 函數中的自由練習模式部分
  - [x] 將 `api.sessions.create` 調用包裝在 `executeWithThinking` 中
  - [x] 設置合適的 `taskName`（如「創建練習會話並生成題目」）
  - [x] 在 `onSuccess` 回調中處理會話創建成功後的邏輯：
    - [x] 獲取題目詳情
    - [x] 設置題目列表、會話數據等狀態
    - [x] 確保題目加載完成後自動跳轉到練習頁面（`setStep('practice')`）
  - [x] 在 `onError` 回調中處理錯誤情況

- [x] 2.2 確保題目加載邏輯正確
  - [x] 確認從 `session.question_ids` 獲取題目 ID 列表
  - [x] 確認調用 `api.questions.list` 獲取題目詳情
  - [x] 確認題目加載完成後再設置狀態和跳轉

## 3. 驗證

- [x] 3.1 測試自由練習模式創建會話
  - [x] 測試題目充足的情況（不觸發 AI 生成）
    - [x] 確認浮窗不顯示（因為沒有 AI 調用）
    - [x] 確認會話創建成功並自動跳轉到練習頁面
  - [x] 測試題目不足的情況（觸發 AI 生成）
    - [x] 確認浮窗正常顯示（顯示「創建練習會話並生成題目」）
    - [x] 確認思考過程展示正確
    - [x] 確認生成完成後自動跳轉到練習頁面
    - [x] 確認題目正確加載並顯示

- [x] 3.2 測試錯誤處理
  - [x] 測試 AI 生成失敗的情況
    - [x] 確認浮窗顯示錯誤信息
    - [x] 確認用戶可以手動關閉浮窗
    - [x] 確認不會導致頁面崩潰

- [x] 3.3 對比其他練習模式
  - [x] 確認自由練習模式與學校輪次模擬、弱點專項練習的體驗一致
  - [x] 確認所有模式都正確使用 AI 懸浮窗

## 4. 文檔更新

- [x] 4.1 更新項目文檔（如果需要）
  - [x] 確認 `openspec/project.md` 中的規範已正確反映實現
  - [x] 確認所有練習模式都符合規範要求
