# Capability: School Profiles (学校特征管理)

## MODIFIED Requirements

### Requirement: 学校特征查询
系统SHALL提供便捷的学校特征查询功能。

#### Scenario: 按代码查询学校
- **WHEN** 用户通过学校代码（如"SPCC"）查询
- **THEN** 返回该学校的完整特征信息
- **AND** 以结构化格式展示（CLI表格或Web卡片）

#### Scenario: 列出所有学校
- **WHEN** 用户请求查看所有支持的学校
- **THEN** 列出学校代码、全称、简短描述
- **AND** 按字母顺序或热门程度排序

#### Scenario: 搜索学校
- **WHEN** 用户输入学校名称关键词（如"保罗"）
- **THEN** 返回名称匹配的学校列表
- **AND** 支持中文和英文搜索

#### Scenario: 查询学校轮次相关信息
- **WHEN** 用户查询某学校的特定轮次信息（如SPCC第一轮）
- **THEN** 系统返回该学校该轮次的历史题目列表
- **AND** 返回该学校该轮次的面试回忆列表
- **AND** 返回该轮次的常见考查重点（基于历史数据分析）
- **AND** 如果该轮次数据不足，返回该学校的其他轮次数据或一般特征

## ADDED Requirements

### Requirement: 面试轮次信息管理
系统SHALL支持在面试回忆中记录和管理面试轮次信息，并支持基于轮次查询和应用。

#### Scenario: 录入面试回忆时指定轮次
- **WHEN** 用户在面试回忆录入界面输入回忆文本
- **THEN** 系统提供轮次选择字段（标准选项：第一轮、第二轮、最终轮，以及自定义输入）
- **AND** 用户可以选择或输入轮次信息
- **AND** 系统将轮次信息保存到`interview_memories`表的`interview_round`字段

#### Scenario: AI提取轮次信息
- **WHEN** 用户提交面试回忆文本进行AI分析
- **THEN** AI尝试从文本中识别轮次信息（如"第一轮"、"第二轮"等关键词）
- **AND** 如果识别到轮次信息，自动填充到轮次字段
- **AND** 用户可以在AI分析后手动调整轮次信息

#### Scenario: 按学校和轮次查询历史数据
- **WHEN** 系统需要为某学校某轮次生成模拟题目
- **THEN** 系统查询`interview_memories`表中`school_code`和`interview_round`匹配的记录
- **AND** 查询`questions`表中`school_code`匹配且来源为`interview_memory`的题目
- **AND** 如果查询结果包含轮次信息，优先使用完全匹配的记录
- **AND** 返回按相关性排序的结果列表

#### Scenario: 轮次信息在题目生成中的应用
- **WHEN** AI生成针对某学校某轮次的模拟题目
- **THEN** 系统将以下信息作为上下文传递给AI：
  - 该学校的一般特征（从`school_profiles`表获取）
  - 该学校该轮次的历史题目（从`questions`表获取）
  - 该学校该轮次的面试回忆（从`interview_memories`表获取）
  - 该轮次的常见考查重点（基于历史数据分析）
- **AND** AI生成的题目应参考这些信息，保持风格一致性
