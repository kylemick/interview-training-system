# 簡體中文轉繁體中文數據庫遷移說明

## 概述

此遷移腳本用於將數據庫中已存在的簡體中文內容轉換為繁體中文。

## 重要提示

⚠️ **在執行遷移前，請務必備份數據庫！**

此遷移會直接修改數據庫內容，建議：
1. 先備份數據庫
2. 在測試環境中先執行遷移
3. 驗證轉換結果後再在生產環境執行

## 執行方法

```bash
# 在 backend 目錄下執行
cd interview-training-system/backend
tsx migrations/convert_simplified_to_traditional_chinese.ts
```

## 轉換範圍

此腳本會轉換以下表中的簡體中文內容：

1. **school_profiles** - 學校檔案表
   - `name_zh` (學校中文名)
   - `notes` (備註說明)

2. **questions** - 題庫表（排除英文專項）
   - `question_text` (題目內容)
   - `reference_answer` (參考答案)
   - `tags` (標籤陣列，JSON格式)
   - `notes` (備註信息)

3. **student_weaknesses** - 學生弱點分析表
   - `description` (弱點描述)
   - `example_text` (示例文本)
   - `improvement_suggestions` (改進建議)

4. **learning_materials** - 學習素材表
   - `title` (素材標題)
   - `content` (素材內容)

5. **training_plans** - 訓練計劃表
   - `ai_suggestions` (AI生成的建議)

6. **session_summaries** - 會話總結表
   - `suggestions` (改進建議)

7. **interview_memories** - 面試回憶表
   - `memory_text` (回憶內容)

8. **qa_records** - 問答記錄表
   - `question_text` (問題內容)
   - `answer_text` (回答內容)

## 注意事項

1. **英文專項內容不轉換**：`english-oral` 和 `english-reading` 類別的內容保持不變
2. **轉換準確性**：當前使用字符級別的轉換映射，對於複雜的詞彙可能不夠準確
3. **建議**：如需更準確的轉換，可以：
   - 安裝 `opencc-js` 庫進行專業轉換
   - 或手動檢查和修正轉換結果

## 驗證轉換結果

執行遷移後，建議檢查：
1. 隨機抽查幾條記錄，確認轉換正確
2. 檢查是否有遺漏的簡體中文
3. 確認英文專項內容未被誤轉換

## 回滾方法

如果轉換出現問題，可以使用備份恢復數據庫。
