# Capability: Question Bank (题库管理)

## Purpose

题库管理能力为香港升中面试训练系统提供题目的存储、管理和生成功能。支持七大专项类别（英文口语、中文表达、逻辑思维、时事常识、科学常识、个人成长、小组讨论），通过AI自动生成和手动导入相结合的方式构建题库，并提供查询、筛选、统计等功能以优化练习效果。
## Requirements
### Requirement: 题目数据模型
系统SHALL定义标准化的题目数据结构，支持七大专项类别。

#### Scenario: 存储题目元数据
- **WHEN** 系统创建或导入题目
- **THEN** 每道题目包含：唯一ID、专项类别、难度等级、学校标签、题目文本、参考答案、评分标准
- **AND** 可选字段：创建时间、来源（手动/AI生成）、使用次数、平均得分

#### Scenario: 七大专项类别定义
- **WHEN** 系统初始化题库
- **THEN** 支持以下类别：`english-oral`（英文口语）、`chinese-oral`（中文表达）、`logic-thinking`（逻辑思维）、`current-affairs`（时事常识）、`science-knowledge`（科学常识）、`personal-growth`（个人成长）、`group-discussion`（小组讨论）
- **AND** 每个类别有清晰的描述和示例题目

### Requirement: 题目录入和导入
系统SHALL支持手动录入和批量导入题目，但不自动导入种子数据。学校字段必须通过数据库学校列表进行选择。

#### Scenario: 系统初始化不自动导入题目
- **WHEN** 系统首次启动或重启
- **THEN** 数据库表结构正确创建
- **AND** 不自动导入任何种子题目数据
- **AND** 题库为空，等待用户手动生成或导入

#### Scenario: 手动触发种子数据导入（可选）
- **WHEN** 用户通过API调用 POST /api/data/seed-questions
- **THEN** 系统导入预定义的种子题目
- **AND** 检查是否已存在相同题目（基于question_text）
- **AND** 跳过已存在的题目，只导入新题目
- **AND** 返回导入统计（新增数、跳过数）

#### Scenario: 推荐通过AI生成题目
- **WHEN** 用户需要题目进行练习
- **THEN** 系统推荐用户使用AI生成题目功能（POST /api/ai/generate-questions）
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

### Requirement: 题目查询和筛选
系统SHALL提供灵活的题目查询功能。

#### Scenario: 按类别查询题目
- **WHEN** 用户查询特定类别的题目（如"english-oral"）
- **THEN** 返回该类别的所有题目列表
- **AND** 显示每题的ID、难度、简短文本预览

#### Scenario: 按学校标签筛选
- **WHEN** 用户指定目标学校（如"SPCC"）查询题目
- **THEN** 返回标记为该学校相关或适用于该校的题目
- **AND** 优先显示该校真题或高相关题目

#### Scenario: 按难度筛选
- **WHEN** 用户指定难度范围（如"3-5"）查询题目
- **THEN** 返回难度在该范围内的题目
- **AND** 可结合类别和学校标签进行多条件筛选

#### Scenario: 随机选题
- **WHEN** 系统需要为练习会话选择题目
- **THEN** 根据筛选条件（类别、难度、学校）随机选择题目
- **AND** 避免短期内重复（如最近10次会话未使用）
- **AND** 优先选择用户表现较弱的子类别题目

### Requirement: AI生成题目
系统SHALL使用AI生成题目以扩充题库，并支持从面试回忆中提取题目。生成题目时必须遵循类别语言规范。

#### Scenario: 生成指定类别题目
- **WHEN** 用户请求生成N道指定类别的题目
- **THEN** 系统调用AI API，提供类别、难度、学校上下文
- **AND** 对于english-oral类别，提示词明确要求全英文输出
- **AND** 对于其他类别，使用中文输出
- **AND** AI返回题目列表（JSON格式），包含题目文本、参考答案、评分标准
- **AND** 系统验证并保存生成的题目，标注来源为"AI生成"

#### Scenario: 生成english-oral题目的语言验证
- **WHEN** AI生成english-oral题目后
- **THEN** 系统检查question_text是否包含英文字符
- **AND** 如果检测到大量中文字符（>30%），记录警告日志
- **AND** 保存题目但标记需要人工复核

### Requirement: 题目质量管理
系统SHALL支持题目的评价、编辑和删除。

#### Scenario: 编辑题目内容
- **WHEN** 用户发现题目有误或需要优化
- **THEN** 用户可编辑题目的任意字段（文本、难度、标签等）
- **AND** 系统保存修改历史（修改时间、修改人）
- **AND** 已使用该题的历史会话保留原题目快照

#### Scenario: 标记题目质量
- **WHEN** 用户或系统评估题目质量
- **THEN** 可对题目标记质量标签（优秀/良好/需改进）
- **AND** 选题时优先选择"优秀"和"良好"题目
- **AND** "需改进"题目不自动选用，仅供手动查看和修正

#### Scenario: 删除低质量题目
- **WHEN** 用户删除题目
- **THEN** 系统标记题目为"已删除"而非物理删除
- **AND** 历史会话中的该题记录保留但注明"题目已下架"
- **AND** 删除的题目不再出现在选题池中

### Requirement: 题目统计和分析
系统SHALL收集题目使用数据以优化题库。

#### Scenario: 统计题目使用频率
- **WHEN** 查看题库统计数据
- **THEN** 显示每道题的使用次数、最后使用时间
- **AND** 识别长期未使用的题目（如>30天未使用）
- **AND** 建议补充或生成新题

#### Scenario: 统计题目平均表现
- **WHEN** 题目被使用多次后
- **THEN** 计算该题的平均得分和答题时长
- **AND** 识别过难（平均分<50%）或过易（平均分>90%）的题目
- **AND** 建议调整难度标签或题目内容

### Requirement: 数据去重
系统SHALL确保题库中不存在完全相同的题目。

#### Scenario: 防止导入重复题目
- **WHEN** 系统导入题目（种子数据或批量导入）
- **THEN** 检查question_text是否已存在
- **AND** 如果已存在，跳过该题目
- **AND** 记录日志说明跳过原因

#### Scenario: 清理现有重复数据
- **WHEN** 数据库中存在重复题目
- **THEN** 提供数据清理脚本或API
- **AND** 保留每个唯一题目的最早一条记录
- **AND** 删除其他重复记录
- **AND** 记录清理日志（删除数量）

### Requirement: 英文题库语言强制规范
系统SHALL在处理英文口语（english-oral）专项题库时，强制所有内容使用英文。

#### Scenario: AI生成英文题目
- **WHEN** 用户请求生成english-oral类别的题目
- **THEN** 系统调用AI时在提示词开头明确限定："IMPORTANT: You MUST respond in English ONLY."
- **AND** AI生成的题目内容（question_text）必须是英文
- **AND** 参考答案（reference_answer）必须是英文
- **AND** 标签（tags）必须是英文
- **AND** 提示词中的所有说明和示例必须使用英文

#### Scenario: AI生成英文反馈
- **WHEN** 用户提交english-oral类别的题目答案请求反馈
- **THEN** 系统调用AI时在提示词开头明确限定："IMPORTANT: You MUST respond in English ONLY."
- **AND** AI生成的反馈必须使用英文
- **AND** strengths（优点）字段必须是英文
- **AND** weaknesses（不足）字段必须是英文
- **AND** suggestions（建议）字段必须是英文
- **AND** reference_answer（参考答案）字段必须是英文
- **AND** reference_thinking（答题思路）字段必须是英文
- **AND** 提示词中的所有说明、评分标准、示例必须使用英文

#### Scenario: 历史题目显示
- **WHEN** 前端显示english-oral类别的历史题目和反馈
- **THEN** 保持题目和反馈的英文内容不翻译
- **AND** UI界面可以使用中文标签（如"题目：""反馈："），但内容本身保持英文

#### Scenario: 提示词语言切换和强制限定
- **WHEN** 系统调用AI API生成english-oral内容
- **THEN** 提示词开头必须包含明确的语言指令："IMPORTANT: You MUST respond in English ONLY."
- **AND** 提示词的所有说明、要求、示例都必须使用英文
- **AND** JSON格式要求中明确标注所有字段值必须是英文
- **AND** 对于其他类别（chinese-oral等），保持原有中文输出

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

