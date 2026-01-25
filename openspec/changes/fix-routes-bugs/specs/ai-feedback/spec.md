# Capability: AI Feedback (AI 反馈生成)

## MODIFIED Requirements

### Requirement: 會話總結查询
係統SHALL健壮地处理會話總結的 JSON 字段。

#### Scenario: 获取单个會話總結
- **WHEN** 用户查询會話總結
- **THEN** 正確解析 strengths 和 weaknesses JSON 數組
- **AND** 每个字段独立处理，一个失敗不影响另一个
- **AND** 解析失敗時返回空數組并記錄警告

#### Scenario: 获取历史反馈列表
- **WHEN** 用户请求历史反馈列表
- **THEN** 使用 queryWithPagination() 函數处理分页
- **AND** limit 參數默认为 20，最大不超過 100
- **AND** 批量解析所有記錄的 JSON 字段
- **AND** 每条記錄的解析失敗不影响其他記錄
