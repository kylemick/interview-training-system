# Change: 增加AI思考過程展示功能

## Why

当前係統中，所有AI調用（生成題目、生成反馈、生成訓練計劃等）都是异步的，用户只能看到简单的loading提示，无法了解AI正在做什么。这導致：

1. **用户体验不佳**：用户不知道AI在思考什么，只能被動等待，容易产生焦虑
2. **交互不透明**：長時間等待（可能30秒以上）没有反馈，用户不知道係統是否正常工作
3. **缺乏教育價值**：无法展示AI的思考過程，失去了向用户展示AI如何分析問題的机會

通過增加一个悬浮框展示AI思考過程，可以让用户：
- 实時了解AI正在处理什么任務
- 看到AI的思考步骤和推理過程
- 在等待過程中保持對係統的信任和耐心

## What Changes

- **新增全局AI思考展示組件**：創建一个可复用的悬浮框組件，用于展示AI思考過程
- **集成到所有AI調用页面**：在以下页面集成思考展示功能：
  - 題庫管理页面（生成題目）
  - 訓練計劃页面（生成計劃）
  - 練習页面（生成反馈）
  - 學校檔案页面（生成學校檔案）
  - 面試回憶页面（提取面試回憶）
  - 弱點分析页面（生成題目和學習素材）
  - Dashboard页面（生成題目）
- **後端支持思考步骤**：修改後端AI調用，支持返回中間思考步骤（或模拟思考過程）
- **前端狀態管理**：創建全局狀態管理，統一管理AI思考過程的展示

## Impact

- **Affected specs**: 
  - 新增 `ai-thinking-display` capability
  - 可能修改 `ai-feedback`, `interview-practice`, `question-bank`, `training-plans` 等现有capability
- **Affected code**: 
  - 前端：新增 `components/AiThinkingDisplay/index.tsx`
  - 前端：修改 `hooks/useAiLoading.ts` 或創建新的 `hooks/useAiThinking.ts`
  - 前端：修改所有使用AI調用的页面組件
  - 後端：修改 `routes/ai.ts` 和相關AI生成函數，支持返回思考步骤
  - 後端：可能需要修改 `ai/deepseek.ts` 支持流式输出（如果DeepSeek API支持）
