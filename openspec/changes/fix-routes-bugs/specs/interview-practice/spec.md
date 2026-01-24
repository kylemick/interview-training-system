# Capability: Interview Practice (面试练习)

## MODIFIED Requirements

### Requirement: 练习会话列表查询
系统SHALL使用安全的分页查询方法。

#### Scenario: 获取最近会话列表
- **WHEN** 用户请求最近的练习会话
- **THEN** 使用 queryWithPagination() 函数处理分页
- **AND** limit 参数默认为 10，最大不超过 100
- **AND** 避免 MySQL2 的 LIMIT 参数类型问题

### Requirement: 问答记录的 AI 反馈
系统SHALL健壮地处理 AI 反馈的 JSON 字段。

#### Scenario: 解析问答记录的 AI 反馈
- **WHEN** 读取问答记录
- **THEN** 正确解析 ai_feedback JSON 对象
- **AND** 处理字符串和对象两种类型
- **AND** 解析失败时返回 null 并记录警告
- **AND** 不影响整个记录的返回
