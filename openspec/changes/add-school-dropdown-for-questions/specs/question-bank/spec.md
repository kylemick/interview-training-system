## MODIFIED Requirements

### Requirement: 题目录入和导入
系统SHALL支持手动录入和批量导入题目,但不自动导入种子数据。学校字段必须通过数据库学校列表进行选择。

#### Scenario: 系统初始化不自动导入题目
- **WHEN** 系统首次启动或重启
- **THEN** 数据库表结构正确创建
- **AND** 不自动导入任何种子题目数据
- **AND** 题库为空,等待用户手动生成或导入

#### Scenario: 手动触发种子数据导入(可选)
- **WHEN** 用户通过API调用 POST /api/data/seed-questions
- **THEN** 系统导入预定义的种子题目
- **AND** 检查是否已存在相同题目(基于question_text)
- **AND** 跳过已存在的题目,只导入新题目
- **AND** 返回导入统计(新增数、跳过数)

#### Scenario: 推荐通过AI生成题目
- **WHEN** 用户需要题目进行练习
- **THEN** 系统推荐用户使用AI生成题目功能(POST /api/ai/generate-questions)
- **AND** 而不是依赖预置的种子数据
- **AND** AI生成的题目更加多样化和个性化

#### Scenario: 手动创建题目时选择学校
- **WHEN** 用户在前端界面手动创建或编辑题目
- **THEN** school_code字段必须提供下拉选择器
- **AND** 下拉选择器选项从数据库`school_profiles`表实时获取
- **AND** 显示学校中文名称(name_zh),值为学校代码(code)
- **AND** 允许用户选择"不指定学校"(空值)
- **AND** 不允许用户手动输入任意文本作为学校代码

#### Scenario: AI生成题目时选择目标学校
- **WHEN** 用户使用AI生成题目功能
- **THEN** school_code字段必须提供下拉选择器
- **AND** 下拉选择器选项从数据库`school_profiles`表实时获取
- **AND** 用户可选择目标学校或不指定
- **AND** 选中的学校代码传递给AI生成接口,用于生成针对性题目

## ADDED Requirements

### Requirement: 学校列表获取接口
系统SHALL提供接口供前端获取有效的学校列表,用于题目创建时的下拉选择。

#### Scenario: 前端获取学校列表
- **WHEN** 前端加载题目创建/编辑界面
- **THEN** 调用 GET /api/schools 获取所有学校档案
- **AND** 接口返回学校列表,包含 code, name, name_zh 字段
- **AND** 前端使用返回的数据填充下拉选择器

#### Scenario: 学校列表实时更新
- **WHEN** 管理员在学校档案页面新增或修改学校
- **THEN** 题目创建界面的学校下拉列表应能获取最新数据
- **AND** 用户刷新页面或重新打开创建界面时加载最新学校列表
