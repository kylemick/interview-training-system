# Implementation Tasks

## 1. 更新规范文档
- [x] 1.1 在question-bank的spec.md中添加语言要求规范

## 2. 修改AI题目生成逻辑
- [x] 2.1 修改questionGenerator.ts中english-oral的提示词，强制生成全英文内容
- [x] 2.2 添加英文输出验证逻辑
- [x] 2.3 测试生成的题目确保是英文

## 3. 修改AI反馈生成逻辑
- [x] 3.1 修改feedbackGenerator.ts，检测english-oral类别时使用英文提示词
- [x] 3.2 确保strengths、weaknesses、suggestions、reference_answer等字段使用英文
- [x] 3.3 测试生成的反馈确保是英文

## 4. 前端显示适配
- [x] 4.1 确认Practice页面正确显示英文题目
- [x] 4.2 确认Feedback页面正确显示英文反馈
- [x] 4.3 添加UI提示说明english-oral专项使用英文

## 5. 数据清理和迁移
- [x] 5.1 检查现有english-oral题目数据的语言情况
- [x] 5.2 如有必要，清理或标记非英文的历史数据
- [x] 5.3 更新数据库中现有english-oral题目（可选）

## 6. 测试和验证
- [x] 6.1 测试AI生成english-oral题目的语言
- [x] 6.2 测试AI生成english-oral反馈的语言
- [x] 6.3 测试历史记录显示
- [x] 6.4 端到端测试完整流程
