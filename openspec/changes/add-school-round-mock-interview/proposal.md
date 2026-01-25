# Change: 增加學校-輪次模拟面試練習模式

## Why

当前係統支持任務模式、自由模式和弱點專項練習模式，但缺少針對特定學校和面試輪次的完整模拟面試功能。用户希望能够：
1. 選擇目標學校和面試輪次（如SPCC第一輪、QC第二輪）
2. 根據该學校過往對应輪次的真实題目，生成類似的模拟題目
3. 完成一次完整的模拟面試，更贴近真实面試场景
4. 在生成題目時能够搜索和參考该學校對应輪次的面試信息，提升題目生成的準確性

这有助于學生進行更有針對性的準備，特別是針對心仪學校的特定面試輪次。

## What Changes

- **新增學校-輪次模拟面試練習模式**：在"開始練習"页面增加新的練習模式選項
- **扩展面試回憶數據結构**：在`interview_memories`表中增加`interview_round`字段，用于記錄面試輪次信息
- **學校輪次信息管理**：支持在面試回憶錄入時指定輪次，并在學校檔案中維护輪次相關信息
- **基于輪次的題目生成**：根據選擇的學校和輪次，搜索该學校對应輪次的過往題目和面試回憶，生成類似的模拟題目
- **完整模拟面試流程**：支持一次完整的模拟面試，包含多道題目，覆盖该輪次常见的考查重點

## Impact

- **Affected specs**: 
  - `interview-practice` - 新增學校-輪次模拟面試模式
  - `school-profiles` - 扩展學校檔案以支持輪次信息查询和应用
- **Affected code**: 
  - `frontend/src/pages/Practice/index.tsx` - 增加新的練習模式選擇
  - `backend/src/routes/sessions.ts` - 新增基于學校和輪次創建會話的邏輯
  - `backend/src/ai/questionGenerator.ts` - 增强題目生成，支持基于輪次信息生成
  - `backend/src/db/schema.sql` - 扩展`interview_memories`表結构
  - `backend/src/routes/ai.ts` - 扩展面試回憶分析，支持輪次信息提取
  - `frontend/src/pages/InterviewMemory/index.tsx` - 增加輪次選擇字段
- **Database changes**: 
  - `interview_memories`表增加`interview_round`字段（VARCHAR(50)，可選）
  - 可能需要增加索引以支持按學校和輪次查询
