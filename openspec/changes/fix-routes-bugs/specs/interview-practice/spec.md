# Capability: Interview Practice (面試練習)

## MODIFIED Requirements

### Requirement: 練習會話列表查询
係統SHALL使用安全的分页查询方法。

#### Scenario: 获取最近會話列表
- **WHEN** 用户请求最近的練習會話
- **THEN** 使用 queryWithPagination() 函數处理分页
- **AND** limit 參數默认为 10，最大不超過 100
- **AND** 避免 MySQL2 的 LIMIT 參數類型問題

### Requirement: 問答記錄的 AI 反馈
係統SHALL健壮地处理 AI 反馈的 JSON 字段。

#### Scenario: 解析問答記錄的 AI 反馈
- **WHEN** 读取問答記錄
- **THEN** 正確解析 ai_feedback JSON 對象
- **AND** 处理字符串和對象两種類型
- **AND** 解析失敗時返回 null 并記錄警告
- **AND** 不影响整个記錄的返回
