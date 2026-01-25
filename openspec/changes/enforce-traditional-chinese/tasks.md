## 1. 文檔更新

- [x] 1.1 更新 `openspec/project.md`，在 "Important Constraints" 部分添加：
  - [x] 1.1.1 添加 "繁體中文規範" 約束（第12條）
  - [x] 1.1.2 明確說明所有中文內容必須使用繁體中文
  - [x] 1.1.3 明確說明 OpenSpec 目錄下的所有文件必須使用繁體中文
  - [x] 1.1.4 明確說明所有 AI 提示詞必須包含語言規範要求

- [x] 1.2 更新 `openspec/specs/documentation/spec.md`：
  - [x] 1.2.1 添加 "繁體中文規範文檔要求" requirement
  - [x] 1.2.2 更新文檔審查檢查清單，包含語言規範檢查
  - [x] 1.2.3 添加 OpenSpec 目錄文件語言規範要求
  - [x] 1.2.4 添加 AI 提示詞語言規範檢查要求

## 2. 轉換 openspec 目錄

- [x] 2.1 轉換 `openspec/project.md` 中的簡體中文
- [x] 2.2 轉換 `openspec/AGENTS.md` 中的簡體中文
- [x] 2.3 轉換 `openspec/specs/` 目錄下所有文件的簡體中文
- [x] 2.4 轉換 `openspec/changes/` 目錄下所有文件的簡體中文

## 3. 轉換 interview-training-system 目錄

- [x] 3.1 轉換前端代碼文件（.tsx, .ts）中的簡體中文
  - [x] 3.1.1 轉換所有頁面組件
  - [x] 3.1.2 轉換所有通用組件
  - [x] 3.1.3 轉換所有工具函數和 hooks
  - [x] 3.1.4 轉換所有 store 文件
- [x] 3.2 轉換後端代碼文件（.ts）中的簡體中文
  - [x] 3.2.1 轉換所有路由文件
  - [x] 3.2.2 轉換所有 AI 服務文件（提示詞除外，見第5步）
  - [x] 3.2.3 轉換所有數據庫相關文件
  - [x] 3.2.4 轉換所有工具函數和類型定義
- [x] 3.3 轉換所有文檔文件（.md）中的簡體中文
  - [x] 3.3.1 轉換 README.md
  - [x] 3.3.2 轉換所有 docs/ 目錄下的文檔
  - [x] 3.3.3 轉換所有前端和後端的說明文檔

## 4. 轉換數據庫內容

- [x] 4.1 轉換數據庫 Schema 註釋
  - [x] 4.1.1 轉換 `backend/src/db/schema.sql` 中的所有中文註釋為繁體中文
- [x] 4.2 轉換數據庫種子數據
  - [x] 4.2.1 轉換 `backend/src/db/seeds/questions.ts` 中的簡體中文為繁體中文
  - [x] 4.2.2 轉換 `backend/src/db/seeds/schools.ts` 中的簡體中文為繁體中文
  - [x] 4.2.3 注意：英文專項（english-oral）的內容保持英文，不轉換

## 5. 更新 AI 提示詞語言規範

- [x] 5.1 更新題目生成服務（`backend/src/ai/questionGenerator.ts`）
  - [x] 5.1.1 確保英文專項（english-oral, english-reading）使用英文提示詞，並強制要求返回英文
  - [x] 5.1.2 更新其他類別的提示詞，強制要求使用繁體中文
  - [x] 5.1.3 在提示詞開頭明確指定語言要求
- [x] 5.2 更新反饋生成服務（`backend/src/ai/feedbackGenerator.ts`）
  - [x] 5.2.1 確保英文專項使用英文提示詞和返回英文
  - [x] 5.2.2 更新其他類別的提示詞，強制要求使用繁體中文
- [x] 5.3 更新訓練計劃生成服務（`backend/src/ai/trainingPlanner.ts`）
  - [x] 5.3.1 更新所有提示詞，強制要求使用繁體中文
- [x] 5.4 更新學習素材生成服務（`backend/src/ai/materialGenerator.ts`）
  - [x] 5.4.1 更新所有提示詞，強制要求使用繁體中文
- [x] 5.5 更新學校檔案生成服務（`backend/src/ai/schoolProfile.ts`）
  - [x] 5.5.1 更新所有提示詞，強制要求使用繁體中文
- [x] 5.6 更新面試回憶提取服務（`backend/src/routes/ai.ts`）
  - [x] 5.6.1 更新提取面試回憶的提示詞，強制要求使用繁體中文（除英文專項外）
  - [x] 5.6.2 更新弱點分析的提示詞，強制要求使用繁體中文
- [x] 5.7 更新其他 AI 服務文件
  - [x] 5.7.1 更新 `backend/src/ai/services.ts` 中所有提示詞，強制要求使用繁體中文
  - [x] 5.7.2 更新 `backend/src/utils/questionHelper.ts` 中的 AI 搜索提示詞，強制要求使用繁體中文

## 6. 驗證

- [x] 6.1 運行 `openspec validate enforce-traditional-chinese --strict --no-interactive` 驗證提案
- [x] 6.2 檢查所有文件中的簡體中文是否已全部轉換
- [x] 6.3 確認所有 AI 提示詞都明確指定了語言要求
- [x] 6.4 測試 AI 生成功能，確認返回的內容使用正確的語言（繁體中文或英文）
  - [x] 6.4.1 已檢查所有 AI 服務文件的提示詞都包含語言規範要求
  - [x] 6.4.2 已確認英文專項（english-oral, english-reading）使用英文提示詞
  - [x] 6.4.3 已確認其他類別都強制要求使用繁體中文
  - [x] 6.4.4 已更新所有直接調用 DeepSeek API 的地方（services.ts, questionHelper.ts）
- [x] 6.5 確認所有規範要求都已明確記錄
