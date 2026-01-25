# Change: 添加学科能力专项训练

## Why

香港升中面试不仅考查口语表达和思维能力，还重点考查学生的学科基础能力。目前系统支持的七大专项类别主要关注面试技巧和表达能力，但缺少针对学科基础能力的专项训练。

学生需要针对性的学科能力训练：
- **中文阅读理解**：通过阅读文章，考察阅读理解、字词理解、观点提炼等能力
- **英文阅读理解**：通过阅读英文文章，考察阅读理解、词汇、观点分析等能力
- **数学基础**：考察计算能力、数学概念理解、基础数学知识应用
- **科学实践**：考察科学现象说明、科学推理、科学行为等能力

这些学科能力是面试中的重要考查点，特别是对于SPCC等重视STEM教育的学校。

## What Changes

- **新增四个学科能力类别**：
  - `chinese-reading`（中文阅读理解）
  - `english-reading`（英文阅读理解）
  - `mathematics`（数学基础）
  - `science-practice`（科学实践）

- **扩展题目数据模型**：支持新的学科能力类别，每个类别有特定的题目生成规则和评估标准

- **增强题目生成能力**：AI生成题目时，针对不同学科能力类别使用专门的提示词和生成策略

- **扩展训练计划支持**：训练计划可以包含学科能力类别的任务分配

- **扩展练习会话支持**：练习会话支持选择学科能力类别进行专项训练

- **更新前端界面**：题库管理、训练计划、练习界面支持新的学科能力类别

## Impact

- **受影响的能力**：
  - `question-bank`（题库管理）- 新增类别支持
  - `training-plans`（训练计划管理）- 支持学科能力类别分配
  - `interview-practice`（面试练习）- 支持学科能力类别练习

- **受影响代码**：
  - `backend/src/routes/questions.ts` - 类别定义和查询
  - `backend/src/ai/questionGenerator.ts` - 题目生成逻辑
  - `backend/src/ai/trainingPlanner.ts` - 训练计划生成
  - `backend/src/types/index.ts` - 类型定义
  - `backend/src/db/schema.sql` - 数据库结构（无需修改，category字段已支持）
  - `frontend/src/pages/Questions/index.tsx` - 题库管理界面
  - `frontend/src/pages/TrainingPlan/index.tsx` - 训练计划界面
  - `frontend/src/pages/Practice/index.tsx` - 练习界面

- **数据库变更**：无需修改数据库结构，`questions.category` 字段已支持任意字符串值

- **向后兼容性**：现有七大专项类别保持不变，新类别作为补充，不影响现有功能
