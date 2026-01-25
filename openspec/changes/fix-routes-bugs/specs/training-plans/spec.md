# Capability: Training Plans (訓練計劃管理)

## MODIFIED Requirements

### Requirement: 訓練計劃查询和筛選
係統SHALL提供灵活的訓練計劃查询功能，確保 JSON 字段解析健壮。

#### Scenario: 获取訓練計劃列表
- **WHEN** 用户查询訓練計劃列表
- **THEN** 返回計劃列表，包含 student_name、target_school、status 等信息
- **AND** 正確解析 category_allocation JSON 字段
- **AND** JSON 解析失敗時返回空對象并記錄警告
- **AND** 不影响整个请求的处理

#### Scenario: 获取单个訓練計劃详情
- **WHEN** 用户查询特定訓練計劃
- **THEN** 返回計劃详情和所有每日任務
- **AND** 正確解析 category_allocation 和 question_ids JSON 字段
- **AND** JSON 解析失敗時使用默认值（空對象/空數組）

### Requirement: 每日任務管理
係統SHALL正確处理每日任務的 JSON 字段。

#### Scenario: 解析任務的題目列表
- **WHEN** 读取每日任務數據
- **THEN** 正確解析 question_ids JSON 數組
- **AND** 处理字符串和對象两種類型
- **AND** 解析失敗時返回空數組并記錄警告
