# Implementation Tasks

## 1. 更新規范文檔
- [x] 1.1 在question-bank的spec.md中添加語言要求規范

## 2. 修改AI題目生成邏輯
- [x] 2.1 修改questionGenerator.ts中english-oral的提示詞，强制生成全英文內容
- [x] 2.2 添加英文输出验证邏輯
- [x] 2.3 测試生成的題目確保是英文

## 3. 修改AI反馈生成邏輯
- [x] 3.1 修改feedbackGenerator.ts，检测english-oral類別時使用英文提示詞
- [x] 3.2 確保strengths、weaknesses、suggestions、reference_answer等字段使用英文
- [x] 3.3 测試生成的反馈確保是英文

## 4. 前端显示适配
- [x] 4.1 確认Practice页面正確显示英文題目
- [x] 4.2 確认Feedback页面正確显示英文反馈
- [x] 4.3 添加UI提示說明english-oral專項使用英文

## 5. 數據清理和迁移
- [x] 5.1 检查现有english-oral題目數據的語言情况
- [x] 5.2 如有必要，清理或標記非英文的历史數據
- [x] 5.3 更新數據庫中现有english-oral題目（可選）

## 6. 测試和验证
- [x] 6.1 测試AI生成english-oral題目的語言
- [x] 6.2 测試AI生成english-oral反馈的語言
- [x] 6.3 测試历史記錄显示
- [x] 6.4 端到端测試完整流程
