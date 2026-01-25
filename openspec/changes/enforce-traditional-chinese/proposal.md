# Change: 強制使用繁體中文規範

## Why

當前項目中存在大量簡體中文內容，但項目目標用戶是香港小學生，應該使用繁體中文以符合本地使用習慣。為了確保項目的一致性和專業性，需要：

1. **統一語言規範**：所有中文內容必須使用繁體中文，避免簡繁混用造成的混淆
2. **符合目標用戶習慣**：香港地區使用繁體中文，使用繁體中文能更好地服務目標用戶
3. **專業性要求**：統一使用繁體中文體現項目的專業性和對本地文化的尊重

## What Changes

- **更新項目文檔**（`openspec/project.md`）：
  - 在 "Important Constraints" 部分添加"繁體中文規範"約束條件
  - 明確要求所有中文內容（代碼註釋、文檔、用戶界面文字等）必須使用繁體中文

- **更新文檔規範**（`openspec/specs/documentation/spec.md`）：
  - 添加繁體中文規範的文檔要求
  - 明確文檔更新檢查清單應包含語言規範檢查

- **轉換所有簡體中文為繁體中文**：
  - 轉換 `openspec/` 目錄下所有文件的簡體中文
  - 轉換 `interview-training-system/` 目錄下所有文件的簡體中文
  - 包括但不限於：代碼註釋、文檔、用戶界面文字、錯誤消息等

- **轉換數據庫中的中文內容**：
  - 轉換數據庫 Schema 註釋（`schema.sql`）中的簡體中文為繁體中文
  - 轉換數據庫種子數據（`seeds/questions.ts`, `seeds/schools.ts`）中的簡體中文為繁體中文
  - 注意：已存在數據庫中的數據需要通過遷移腳本或手動更新

- **更新 AI 提示詞語言規範**：
  - 在所有 DeepSeek AI 調用的提示詞中強制指定語言
  - 英文專項（`english-oral`, `english-reading`）：必須使用英文提示詞，強制要求 AI 返回英文內容
  - 其他所有類別：必須使用繁體中文提示詞，強制要求 AI 返回繁體中文內容
  - 更新所有 AI 服務文件：
    - `backend/src/ai/questionGenerator.ts` - 題目生成
    - `backend/src/ai/feedbackGenerator.ts` - 反饋生成
    - `backend/src/ai/trainingPlanner.ts` - 訓練計劃生成
    - `backend/src/ai/materialGenerator.ts` - 學習素材生成
    - `backend/src/ai/schoolProfile.ts` - 學校檔案生成
    - `backend/src/routes/ai.ts` - 面試回憶提取等

## Impact

- **Affected specs**: 
  - `documentation` - 需要添加新的文檔要求和規範
- **Affected code**: 
  - `openspec/project.md` - 添加新的約束條件
  - `openspec/specs/documentation/spec.md` - 添加新的文檔要求
  - 所有包含中文的文件都需要轉換
  - 所有 AI 服務文件需要更新提示詞語言規範
  - 數據庫 Schema 和種子數據需要轉換
- **Breaking changes**: 無（僅語言轉換，不影響功能）
- **Migration needed**: 
  - 已存在數據庫中的中文數據需要遷移（可選，新生成的數據會自動使用繁體中文）
