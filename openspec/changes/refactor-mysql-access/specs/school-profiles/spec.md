# Capability: School Profiles (學校特征管理)

## MODIFIED Requirements

### Requirement: 學校特征查询
係統SHALL提供便捷的學校特征查询功能，并確保查询操作稳定可靠。

#### Scenario: 按代碼查询學校
- **WHEN** 用户通過學校代碼（如"SPCC"）查询
- **THEN** 返回该學校的完整特征信息
- **AND** 以結构化格式展示（CLI表格或Web卡片）
- **AND** 正確解析 JSON 字段（如 focus_areas）

#### Scenario: 列出所有學校
- **WHEN** 用户请求查看所有支持的學校
- **THEN** 列出學校代碼、全称、简短描述
- **AND** 按字母顺序或热门程度排序
- **AND** 正確处理所有數據庫字段類型
- **AND** JSON 字段被正確解析为對象

#### Scenario: 搜索學校
- **WHEN** 用户输入學校名称關键詞（如"保羅"）
- **THEN** 返回名称匹配的學校列表
- **AND** 支持中文和英文搜索

## ADDED Requirements

### Requirement: JSON 字段解析規范
係統SHALL確保數據庫中的 JSON 字段被正確解析和处理。

#### Scenario: 解析學校 focus_areas 字段
- **WHEN** 從數據庫读取學校記錄
- **THEN** 检查 focus_areas 字段類型（字符串或對象）
- **AND** 如果是字符串，解析为 JSON 對象
- **AND** 如果已经是對象，直接使用
- **AND** 处理解析错误，返回空數組作为默认值

#### Scenario: 統一错误处理
- **WHEN** 數據庫查询或 JSON 解析失敗
- **THEN** 記錄详细错误信息到日志
- **AND** 返回標準化的错误响应给客户端
- **AND** 包含有意义的错误消息和狀態碼
