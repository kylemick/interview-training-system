# Change: 修复反馈显示问题

## Why
用户反馈 logic-thinking（逻辑思维）和 current-affairs（时事常识）类别的反馈数据在数据库中已存在，但无法在页面正确展示。这可能导致：
1. 用户无法查看已生成的反馈内容
2. 影响学习效果追踪
3. 降低系统可用性

## What Changes
- **修复前端反馈解析逻辑**：确保所有类别的反馈数据都能正确解析和显示
- **统一类别名称处理**：处理 `logic-thinking` 和 `logical-thinking` 的不一致问题
- **增强错误处理**：添加防御性编程，处理 JSON 解析失败的情况
- **验证反馈数据完整性**：确保反馈数据在前后端传输过程中保持正确格式

## Impact
- **受影响的能力**：AI反馈系统（ai-feedback）
- **受影响的代码**：
  - `frontend/src/pages/Feedback/index.tsx` - 反馈展示页面
  - `frontend/src/pages/Practice/index.tsx` - 练习页面的反馈显示
  - `backend/src/routes/sessions.ts` - 会话数据返回
  - `backend/src/routes/feedback.ts` - 反馈生成和存储
- **用户体验**：修复后，所有类别的反馈都能正常显示，提升系统可靠性
