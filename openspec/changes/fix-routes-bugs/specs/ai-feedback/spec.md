# Capability: AI Feedback (AI 反馈生成)

## MODIFIED Requirements

### Requirement: 会话总结查询
系统SHALL健壮地处理会话总结的 JSON 字段。

#### Scenario: 获取单个会话总结
- **WHEN** 用户查询会话总结
- **THEN** 正确解析 strengths 和 weaknesses JSON 数组
- **AND** 每个字段独立处理，一个失败不影响另一个
- **AND** 解析失败时返回空数组并记录警告

#### Scenario: 获取历史反馈列表
- **WHEN** 用户请求历史反馈列表
- **THEN** 使用 queryWithPagination() 函数处理分页
- **AND** limit 参数默认为 20，最大不超过 100
- **AND** 批量解析所有记录的 JSON 字段
- **AND** 每条记录的解析失败不影响其他记录
