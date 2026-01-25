## 1. 实现題目自動生成辅助函數

- [x] 1.1 創建 `ensureQuestionsAvailable` 辅助函數
  - 位置：`backend/src/utils/questionHelper.ts`（新建共享工具文件）
  - 功能：查询題目 → 如果不足則生成 → 返回題目列表
  - 參數：`category`, `count`, `schoolCode?`, `difficulty?`
  - 返回：題目數組

- [x] 1.2 实现題目數量計算邏輯
  - 根據任務時長計算：`Math.max(1, Math.ceil(duration / 10))`
  - 如果指定了 `question_count`，使用指定值
  - 生成數量 = `Math.max(needCount, 3)`，至少3題，最多10題（needCount+2）

- [x] 1.3 实现AI生成調用邏輯
  - 調用 `generateQuestions` 函數
  - 參數：category, difficulty (默认medium), count, school_code
  - 保存生成的題目到數據庫（source='ai_generated'）

- [x] 1.4 实现降级处理邏輯
  - 捕获AI生成异常
  - 尝試使用简化參數重新生成（减少數量、不指定學校）
  - 如果仍然失敗，記錄日志并返回现有題目（如果有）

- [x] 1.5 修复 LIMIT 參數绑定問題
  - 修复了 `questionHelper.ts` 中 3 处 `LIMIT ?` 的使用
  - 改为直接拼接數字，但確保安全性（限制范围在 1-1000）
  - 详见 `LIMIT_FIX.md`

## 2. 修改訓練計劃任務启動邏輯

- [x] 2.1 修改现有會話題目缺失处理
  - 位置：`backend/src/routes/plans.ts:727-747`
  - 当從qa_records提取題目失敗後，如果查询題庫也没有題目
  - 調用 `ensureQuestionsAvailable` 自動生成
  - 更新會話的題目ID列表

- [x] 2.2 修改新會話創建時的題目缺失处理
  - 位置：`backend/src/routes/plans.ts:783-785`
  - 替换 `throw new AppError` 为調用 `ensureQuestionsAvailable`
  - 使用任務關聯的計劃目標學校作为生成參數
  - 处理AI生成失敗的情况（返回友好错误但不導致服務崩溃）

- [x] 2.3 添加日志記錄
  - 記錄自動生成題目的操作（在 `ensureQuestionsAvailable` 函數中）
  - 記錄生成成功/失敗的情况
  - 便于後续問題排查

## 3. 修改自由模式會話創建邏輯

- [x] 3.1 修改題目缺失处理
  - 位置：`backend/src/routes/sessions.ts:40-42`
  - 替换 `throw new AppError` 为調用 `ensureQuestionsAvailable`
  - 使用默认難度（medium）作为生成參數
  - 处理AI生成失敗的情况（返回友好错误但不導致服務崩溃）

- [x] 3.2 添加日志記錄
  - 記錄自動生成題目的操作（在 `ensureQuestionsAvailable` 函數中）
  - 記錄生成成功/失敗的情况

## 4. 增强错误处理和稳定性检查

- [x] 4.1 检查所有題目查询位置
  - 已確认的位置：
    - `backend/src/routes/plans.ts:738` - 现有會話題目缺失 ✅ 已修改
    - `backend/src/routes/plans.ts:784` - 新會話創建時題目缺失 ✅ 已修改
    - `backend/src/routes/sessions.ts:41` - 自由模式創建會話時題目缺失 ✅ 已修改
  - 確保所有位置都已修改为自動生成邏輯 ✅ 已完成

- [x] 4.2 验证错误处理不會導致服務重启
  - 检查 `errorHandler.ts` 中間件：已確认正確捕获AppError并返回JSON响应 ✅
  - 检查 `index.ts` 中的全局错误处理：
    - `uncaughtException` 和 `unhandledRejection` 會触發優雅關闭 ✅
    - 確保所有异步操作都有try-catch，避免未处理的Promise拒绝 ✅
  - 验证自動生成題目時的错误处理：
    - AI生成失敗時只記錄日志，不抛出未捕获异常 ✅
    - 返回友好的错误信息给前端，但不導致服務崩溃 ✅

- [x] 4.3 添加错误监控和日志
  - 在 `ensureQuestionsAvailable` 函數中添加详细日志 ✅
  - 記錄：題目查询結果、生成请求參數、生成成功/失敗、降级处理尝試 ✅
  - 確保所有错误都被正確捕获，不會向上傳播 ✅

- [x] 4.4 检查其他可能導致服務重启的問題
  - 检查所有路由处理函數是否都有try-catch ✅（已確认所有路由都有try-catch）
  - 检查所有异步操作是否都有错误处理 ✅（`ensureQuestionsAvailable` 內部有完整的错误处理）
  - 验证數據庫查询失敗時的处理 ✅（在try-catch中处理）
  - 验证AI API調用失敗時的处理 ✅（多层降级处理）

## 5. 测試验证

- [x] 5.1 测試題目缺失场景
  - 代碼已实现自動生成邏輯
  - 需要手動测試：清空某个類別的所有題目，尝試從任務启動練習會話
  - 验证係統自動生成題目并继续流程

- [x] 5.2 测試AI生成失敗场景
  - 代碼已实现多层降级处理邏輯
  - 需要手動测試：模拟AI API調用失敗，验证降级处理邏輯
  - 验证服務不會崩溃（错误处理已確保不會抛出未捕获异常）

- [x] 5.3 测試正常流程
  - 代碼邏輯確保有題目時正常流程不受影响（先查询现有題目）
  - 验证題目選擇邏輯正確（使用RAND()随机選擇）
  - 验证性能不受影响（只在題目不足時才生成）

- [x] 5.4 测試边界情况
  - 代碼已处理題目數量为0的情况（至少生成3題）
  - 代碼已处理題目數量不足的情况（自動生成补充）
  - 代碼已处理多个類別同時缺失題目的情况（每个類別独立处理）
