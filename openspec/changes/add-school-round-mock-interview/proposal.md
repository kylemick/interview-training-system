# Change: 增加学校-轮次模拟面试练习模式

## Why

当前系统支持任务模式、自由模式和弱点专项练习模式，但缺少针对特定学校和面试轮次的完整模拟面试功能。用户希望能够：
1. 选择目标学校和面试轮次（如SPCC第一轮、QC第二轮）
2. 根据该学校过往对应轮次的真实题目，生成类似的模拟题目
3. 完成一次完整的模拟面试，更贴近真实面试场景
4. 在生成题目时能够搜索和参考该学校对应轮次的面试信息，提升题目生成的准确性

这有助于学生进行更有针对性的准备，特别是针对心仪学校的特定面试轮次。

## What Changes

- **新增学校-轮次模拟面试练习模式**：在"开始练习"页面增加新的练习模式选项
- **扩展面试回忆数据结构**：在`interview_memories`表中增加`interview_round`字段，用于记录面试轮次信息
- **学校轮次信息管理**：支持在面试回忆录入时指定轮次，并在学校档案中维护轮次相关信息
- **基于轮次的题目生成**：根据选择的学校和轮次，搜索该学校对应轮次的过往题目和面试回忆，生成类似的模拟题目
- **完整模拟面试流程**：支持一次完整的模拟面试，包含多道题目，覆盖该轮次常见的考查重点

## Impact

- **Affected specs**: 
  - `interview-practice` - 新增学校-轮次模拟面试模式
  - `school-profiles` - 扩展学校档案以支持轮次信息查询和应用
- **Affected code**: 
  - `frontend/src/pages/Practice/index.tsx` - 增加新的练习模式选择
  - `backend/src/routes/sessions.ts` - 新增基于学校和轮次创建会话的逻辑
  - `backend/src/ai/questionGenerator.ts` - 增强题目生成，支持基于轮次信息生成
  - `backend/src/db/schema.sql` - 扩展`interview_memories`表结构
  - `backend/src/routes/ai.ts` - 扩展面试回忆分析，支持轮次信息提取
  - `frontend/src/pages/InterviewMemory/index.tsx` - 增加轮次选择字段
- **Database changes**: 
  - `interview_memories`表增加`interview_round`字段（VARCHAR(50)，可选）
  - 可能需要增加索引以支持按学校和轮次查询
