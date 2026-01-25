# Capability: School Profiles (學校特征管理)

## MODIFIED Requirements

### Requirement: 學校特征查询
係統SHALL提供便捷的學校特征查询功能。

#### Scenario: 按代碼查询學校
- **WHEN** 用户通過學校代碼（如"SPCC"）查询
- **THEN** 返回该學校的完整特征信息
- **AND** 以結构化格式展示（CLI表格或Web卡片）

#### Scenario: 列出所有學校
- **WHEN** 用户请求查看所有支持的學校
- **THEN** 列出學校代碼、全称、简短描述
- **AND** 按字母顺序或热门程度排序

#### Scenario: 搜索學校
- **WHEN** 用户输入學校名称關键詞（如"保羅"）
- **THEN** 返回名称匹配的學校列表
- **AND** 支持中文和英文搜索

#### Scenario: 查询學校輪次相關信息
- **WHEN** 用户查询某學校的特定輪次信息（如SPCC第一輪）
- **THEN** 係統返回该學校该輪次的历史題目列表
- **AND** 返回该學校该輪次的面試回憶列表
- **AND** 返回该輪次的常见考查重點（基于历史數據分析）
- **AND** 如果该輪次數據不足，返回该學校的其他輪次數據或一般特征

## ADDED Requirements

### Requirement: 面試輪次信息管理
係統SHALL支持在面試回憶中記錄和管理面試輪次信息，并支持基于輪次查询和应用。

#### Scenario: 錄入面試回憶時指定輪次
- **WHEN** 用户在面試回憶錄入界面输入回憶文本
- **THEN** 係統提供輪次選擇字段（標準選項：第一輪、第二輪、最终輪，以及自定义输入）
- **AND** 用户可以選擇或输入輪次信息
- **AND** 係統将輪次信息保存到`interview_memories`表的`interview_round`字段

#### Scenario: AI提取輪次信息
- **WHEN** 用户提交面試回憶文本進行AI分析
- **THEN** AI尝試從文本中識別輪次信息（如"第一輪"、"第二輪"等關键詞）
- **AND** 如果識別到輪次信息，自動填充到輪次字段
- **AND** 用户可以在AI分析後手動調整輪次信息

#### Scenario: 按學校和輪次查询历史數據
- **WHEN** 係統需要为某學校某輪次生成模拟題目
- **THEN** 係統查询`interview_memories`表中`school_code`和`interview_round`匹配的記錄
- **AND** 查询`questions`表中`school_code`匹配且來源为`interview_memory`的題目
- **AND** 如果查询結果包含輪次信息，優先使用完全匹配的記錄
- **AND** 返回按相關性排序的結果列表

#### Scenario: 輪次信息在題目生成中的应用
- **WHEN** AI生成針對某學校某輪次的模拟題目
- **THEN** 係統将以下信息作为上下文傳递给AI：
  - 该學校的一般特征（從`school_profiles`表获取）
  - 该學校该輪次的历史題目（從`questions`表获取）
  - 该學校该輪次的面試回憶（從`interview_memories`表获取）
  - 该輪次的常见考查重點（基于历史數據分析）
- **AND** AI生成的題目应參考这些信息，保持風格一致性
