# Capability: School Profiles (学校特征管理)

## MODIFIED Requirements

### Requirement: 学校特征查询
系统SHALL提供便捷的学校特征查询功能，并确保查询操作稳定可靠。

#### Scenario: 按代码查询学校
- **WHEN** 用户通过学校代码（如"SPCC"）查询
- **THEN** 返回该学校的完整特征信息
- **AND** 以结构化格式展示（CLI表格或Web卡片）
- **AND** 正确解析 JSON 字段（如 focus_areas）

#### Scenario: 列出所有学校
- **WHEN** 用户请求查看所有支持的学校
- **THEN** 列出学校代码、全称、简短描述
- **AND** 按字母顺序或热门程度排序
- **AND** 正确处理所有数据库字段类型
- **AND** JSON 字段被正确解析为对象

#### Scenario: 搜索学校
- **WHEN** 用户输入学校名称关键词（如"保罗"）
- **THEN** 返回名称匹配的学校列表
- **AND** 支持中文和英文搜索

## ADDED Requirements

### Requirement: JSON 字段解析规范
系统SHALL确保数据库中的 JSON 字段被正确解析和处理。

#### Scenario: 解析学校 focus_areas 字段
- **WHEN** 从数据库读取学校记录
- **THEN** 检查 focus_areas 字段类型（字符串或对象）
- **AND** 如果是字符串，解析为 JSON 对象
- **AND** 如果已经是对象，直接使用
- **AND** 处理解析错误，返回空数组作为默认值

#### Scenario: 统一错误处理
- **WHEN** 数据库查询或 JSON 解析失败
- **THEN** 记录详细错误信息到日志
- **AND** 返回标准化的错误响应给客户端
- **AND** 包含有意义的错误消息和状态码
