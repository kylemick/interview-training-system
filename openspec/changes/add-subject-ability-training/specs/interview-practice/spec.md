# Capability: Interview Practice (面试练习)

## MODIFIED Requirements

### Requirement: 启动练习会话
系统SHALL支持启动包含七大专项类别和四个学科能力类别的练习会话。

#### Scenario: 选择专项类别启动练习
- **WHEN** 用户选择专项类别（如"english-oral"）启动练习
- **THEN** 系统创建练习会话，从题库中选择该类别的题目
- **AND** 支持七大专项类别：`english-oral`、`chinese-oral`、`logic-thinking`、`current-affairs`、`science-knowledge`、`personal-growth`、`group-discussion`
- **AND** 支持四个学科能力类别：`chinese-reading`、`english-reading`、`mathematics`、`science-practice`

#### Scenario: 选择学科能力类别启动练习
- **WHEN** 用户选择学科能力类别（如"chinese-reading"）启动练习
- **THEN** 系统创建练习会话，从题库中选择该学科能力类别的题目
- **AND** 对于阅读理解类别，系统提供完整的文章和问题列表
- **AND** 对于数学和科学类别，系统提供题目和答题界面

## ADDED Requirements

### Requirement: 学科能力练习模式
系统SHALL支持学科能力类别的专门练习模式。

#### Scenario: 中文阅读理解练习
- **WHEN** 用户选择 `chinese-reading` 类别进行练习
- **THEN** 系统显示阅读文章（200-500字）
- **AND** 用户阅读文章后，系统依次显示阅读理解问题
- **AND** 问题类型包括：文章主旨、细节理解、字词解释、观点提炼
- **AND** 用户提交答案后，系统提供详细反馈，包括参考答案和评分

#### Scenario: 英文阅读理解练习
- **WHEN** 用户选择 `english-reading` 类别进行练习
- **THEN** 系统显示英文阅读文章（150-400字，全英文）
- **AND** 用户阅读文章后，系统依次显示英文阅读理解问题（全英文）
- **AND** 问题类型包括：文章主旨、细节理解、词汇解释、观点分析
- **AND** 用户提交答案后，系统提供英文反馈，包括参考答案和评分

#### Scenario: 数学基础练习
- **WHEN** 用户选择 `mathematics` 类别进行练习
- **THEN** 系统显示数学题目（计算题、概念题、应用题）
- **AND** 用户可以在答题界面输入答案或解题过程
- **AND** 系统支持文字输入和可能的数学公式输入
- **AND** 用户提交答案后，系统提供详细反馈，包括解题步骤、计算方法和答案验证

#### Scenario: 科学实践练习
- **WHEN** 用户选择 `science-practice` 类别进行练习
- **THEN** 系统显示科学题目（现象说明、推理题、行为题）
- **AND** 题目结合生活实际，适合小学生理解
- **AND** 用户提交答案后，系统提供详细反馈，包括科学原理解释、推理过程、实际应用

### Requirement: 学科能力题目展示
系统SHALL为学科能力类别提供专门的题目展示界面。

#### Scenario: 阅读理解题目展示
- **WHEN** 练习会话包含阅读理解题目
- **THEN** 文章内容完整显示，支持滚动查看
- **AND** 问题依次显示，用户完成一题后显示下一题
- **AND** 支持返回查看文章内容

#### Scenario: 数学和科学题目展示
- **WHEN** 练习会话包含数学或科学题目
- **THEN** 题目清晰显示，包含必要的图表或说明
- **AND** 答题界面支持文字输入和可能的公式输入
- **AND** 支持多步骤答题过程
