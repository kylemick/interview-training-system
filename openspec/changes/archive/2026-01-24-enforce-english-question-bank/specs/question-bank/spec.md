# Capability: Question Bank (题库管理)

## ADDED Requirements

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

## MODIFIED Requirements

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
