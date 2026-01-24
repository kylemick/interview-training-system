# Change: 强制英文题库语言规范

## Why
当前系统在处理英文口语（english-oral）专项题库时，AI生成题目、反馈和历史记录显示的语言不统一。为了确保学生获得真实的英语面试训练体验，需要强制所有英文题库相关内容使用英文，包括：
- AI生成的题目内容
- AI生成的反馈（优点、缺点、建议）
- 历史记录中的题目显示

这对于英语口语能力的提升至关重要，也符合香港顶尖中学面试的实际场景。

## What Changes
- **题目生成**：english-oral类别的题目必须生成全英文内容（题目、参考答案、标签）
- **反馈生成**：english-oral类别的反馈必须使用英文（strengths、weaknesses、suggestions、reference_answer等）
- **历史记录**：前端显示english-oral类别的历史题目和反馈时保持英文
- **规范文档**：在question-bank规范中明确语言要求

**BREAKING**: 无

## Impact
- 受影响的规范：question-bank
- 受影响的代码：
  - `backend/src/ai/questionGenerator.ts` - 题目生成提示词
  - `backend/src/ai/feedbackGenerator.ts` - 反馈生成提示词
  - `frontend/src/pages/Practice/index.tsx` - 题目显示
  - `frontend/src/pages/Feedback/index.tsx` - 历史反馈显示
