# Capability: Training Plans (训练计划管理)

## MODIFIED Requirements

### Requirement: 训练计划查询和筛选
系统SHALL提供灵活的训练计划查询功能，确保 JSON 字段解析健壮。

#### Scenario: 获取训练计划列表
- **WHEN** 用户查询训练计划列表
- **THEN** 返回计划列表，包含 student_name、target_school、status 等信息
- **AND** 正确解析 category_allocation JSON 字段
- **AND** JSON 解析失败时返回空对象并记录警告
- **AND** 不影响整个请求的处理

#### Scenario: 获取单个训练计划详情
- **WHEN** 用户查询特定训练计划
- **THEN** 返回计划详情和所有每日任务
- **AND** 正确解析 category_allocation 和 question_ids JSON 字段
- **AND** JSON 解析失败时使用默认值（空对象/空数组）

### Requirement: 每日任务管理
系统SHALL正确处理每日任务的 JSON 字段。

#### Scenario: 解析任务的题目列表
- **WHEN** 读取每日任务数据
- **THEN** 正确解析 question_ids JSON 数组
- **AND** 处理字符串和对象两种类型
- **AND** 解析失败时返回空数组并记录警告
