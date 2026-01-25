# Change: 增加AI思考过程展示功能

## Why

当前系统中，所有AI调用（生成题目、生成反馈、生成训练计划等）都是异步的，用户只能看到简单的loading提示，无法了解AI正在做什么。这导致：

1. **用户体验不佳**：用户不知道AI在思考什么，只能被动等待，容易产生焦虑
2. **交互不透明**：长时间等待（可能30秒以上）没有反馈，用户不知道系统是否正常工作
3. **缺乏教育价值**：无法展示AI的思考过程，失去了向用户展示AI如何分析问题的机会

通过增加一个悬浮框展示AI思考过程，可以让用户：
- 实时了解AI正在处理什么任务
- 看到AI的思考步骤和推理过程
- 在等待过程中保持对系统的信任和耐心

## What Changes

- **新增全局AI思考展示组件**：创建一个可复用的悬浮框组件，用于展示AI思考过程
- **集成到所有AI调用页面**：在以下页面集成思考展示功能：
  - 题库管理页面（生成题目）
  - 训练计划页面（生成计划）
  - 练习页面（生成反馈）
  - 学校档案页面（生成学校档案）
  - 面试回忆页面（提取面试回忆）
  - 弱点分析页面（生成题目和学习素材）
  - Dashboard页面（生成题目）
- **后端支持思考步骤**：修改后端AI调用，支持返回中间思考步骤（或模拟思考过程）
- **前端状态管理**：创建全局状态管理，统一管理AI思考过程的展示

## Impact

- **Affected specs**: 
  - 新增 `ai-thinking-display` capability
  - 可能修改 `ai-feedback`, `interview-practice`, `question-bank`, `training-plans` 等现有capability
- **Affected code**: 
  - 前端：新增 `components/AiThinkingDisplay/index.tsx`
  - 前端：修改 `hooks/useAiLoading.ts` 或创建新的 `hooks/useAiThinking.ts`
  - 前端：修改所有使用AI调用的页面组件
  - 后端：修改 `routes/ai.ts` 和相关AI生成函数，支持返回思考步骤
  - 后端：可能需要修改 `ai/deepseek.ts` 支持流式输出（如果DeepSeek API支持）
