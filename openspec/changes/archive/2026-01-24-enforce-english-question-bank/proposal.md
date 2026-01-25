# Change: 强制英文題庫語言規范

## Why
当前係統在处理英文口語（english-oral）專項題庫時，AI生成題目、反馈和历史記錄显示的語言不統一。为了確保學生获得真实的英語面試訓練体验，需要强制所有英文題庫相關內容使用英文，包括：
- AI生成的題目內容
- AI生成的反馈（優點、缺點、建議）
- 历史記錄中的題目显示

这對于英語口語能力的提升至關重要，也符合香港顶尖中學面試的实际场景。

## What Changes
- **題目生成**：english-oral類別的題目必须生成全英文內容（題目、參考答案、標籤）
- **反馈生成**：english-oral類別的反馈必须使用英文（strengths、weaknesses、suggestions、reference_answer等）
- **历史記錄**：前端显示english-oral類別的历史題目和反馈時保持英文
- **規范文檔**：在question-bank規范中明確語言要求

**BREAKING**: 无

## Impact
- 受影响的規范：question-bank
- 受影响的代碼：
  - `backend/src/ai/questionGenerator.ts` - 題目生成提示詞
  - `backend/src/ai/feedbackGenerator.ts` - 反馈生成提示詞
  - `frontend/src/pages/Practice/index.tsx` - 題目显示
  - `frontend/src/pages/Feedback/index.tsx` - 历史反馈显示
