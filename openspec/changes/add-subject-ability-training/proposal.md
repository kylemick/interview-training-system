# Change: 添加學科能力專項訓練

## Why

香港升中面試不仅考查口語表達和思維能力，还重點考查學生的學科基础能力。目前係統支持的七大專項類別主要關注面試技巧和表達能力，但缺少針對學科基础能力的專項訓練。

學生需要針對性的學科能力訓練：
- **中文阅读理解**：通過阅读文章，考察阅读理解、字詞理解、觀點提炼等能力
- **英文阅读理解**：通過阅读英文文章，考察阅读理解、詞汇、觀點分析等能力
- **數學基础**：考察計算能力、數學概念理解、基础數學知識应用
- **科學实践**：考察科學现象說明、科學推理、科學行为等能力

这些學科能力是面試中的重要考查點，特別是對于SPCC等重视STEM教育的學校。

## What Changes

- **新增四个學科能力類別**：
  - `chinese-reading`（中文阅读理解）
  - `english-reading`（英文阅读理解）
  - `mathematics`（數學基础）
  - `science-practice`（科學实践）

- **扩展題目數據模型**：支持新的學科能力類別，每个類別有特定的題目生成規則和評估標準

- **增强題目生成能力**：AI生成題目時，針對不同學科能力類別使用專门的提示詞和生成策略

- **扩展訓練計劃支持**：訓練計劃可以包含學科能力類別的任務分配

- **扩展練習會話支持**：練習會話支持選擇學科能力類別進行專項訓練

- **更新前端界面**：題庫管理、訓練計劃、練習界面支持新的學科能力類別

## Impact

- **受影响的能力**：
  - `question-bank`（題庫管理）- 新增類別支持
  - `training-plans`（訓練計劃管理）- 支持學科能力類別分配
  - `interview-practice`（面試練習）- 支持學科能力類別練習

- **受影响代碼**：
  - `backend/src/routes/questions.ts` - 類別定义和查询
  - `backend/src/ai/questionGenerator.ts` - 題目生成邏輯
  - `backend/src/ai/trainingPlanner.ts` - 訓練計劃生成
  - `backend/src/types/index.ts` - 類型定义
  - `backend/src/db/schema.sql` - 數據庫結构（无需修改，category字段已支持）
  - `frontend/src/pages/Questions/index.tsx` - 題庫管理界面
  - `frontend/src/pages/TrainingPlan/index.tsx` - 訓練計劃界面
  - `frontend/src/pages/Practice/index.tsx` - 練習界面

- **數據庫变更**：无需修改數據庫結构，`questions.category` 字段已支持任意字符串值

- **向後兼容性**：现有七大專項類別保持不变，新類別作为补充，不影响现有功能
