# Capability: Question Bank (題庫管理)

## ADDED Requirements

### Requirement: 英文題庫語言强制規范
係統SHALL在处理英文口語（english-oral）專項題庫時，强制所有內容使用英文。

#### Scenario: AI生成英文題目
- **WHEN** 用户请求生成english-oral類別的題目
- **THEN** 係統調用AI時在提示詞開头明確限定："IMPORTANT: You MUST respond in English ONLY."
- **AND** AI生成的題目內容（question_text）必须是英文
- **AND** 參考答案（reference_answer）必须是英文
- **AND** 標籤（tags）必须是英文
- **AND** 提示詞中的所有說明和示例必须使用英文

#### Scenario: AI生成英文反馈
- **WHEN** 用户提交english-oral類別的題目答案请求反馈
- **THEN** 係統調用AI時在提示詞開头明確限定："IMPORTANT: You MUST respond in English ONLY."
- **AND** AI生成的反馈必须使用英文
- **AND** strengths（優點）字段必须是英文
- **AND** weaknesses（不足）字段必须是英文
- **AND** suggestions（建議）字段必须是英文
- **AND** reference_answer（參考答案）字段必须是英文
- **AND** reference_thinking（答題思路）字段必须是英文
- **AND** 提示詞中的所有說明、評分標準、示例必须使用英文

#### Scenario: 历史題目显示
- **WHEN** 前端显示english-oral類別的历史題目和反馈
- **THEN** 保持題目和反馈的英文內容不翻译
- **AND** UI界面可以使用中文標籤（如"題目：""反馈："），但內容本身保持英文

#### Scenario: 提示詞語言切换和强制限定
- **WHEN** 係統調用AI API生成english-oral內容
- **THEN** 提示詞開头必须包含明確的語言指令："IMPORTANT: You MUST respond in English ONLY."
- **AND** 提示詞的所有說明、要求、示例都必须使用英文
- **AND** JSON格式要求中明確標注所有字段值必须是英文
- **AND** 對于其他類別（chinese-oral等），保持原有中文输出

## MODIFIED Requirements

### Requirement: AI生成題目
係統SHALL使用AI生成題目以扩充題庫，并支持從面試回憶中提取題目。生成題目時必须遵循類別語言規范。

#### Scenario: 生成指定類別題目
- **WHEN** 用户请求生成N道指定類別的題目
- **THEN** 係統調用AI API，提供類別、難度、學校上下文
- **AND** 對于english-oral類別，提示詞明確要求全英文输出
- **AND** 對于其他類別，使用中文输出
- **AND** AI返回題目列表（JSON格式），包含題目文本、參考答案、評分標準
- **AND** 係統验证并保存生成的題目，標注來源为"AI生成"

#### Scenario: 生成english-oral題目的語言验证
- **WHEN** AI生成english-oral題目後
- **THEN** 係統检查question_text是否包含英文字符
- **AND** 如果检测到大量中文字符（>30%），記錄警告日志
- **AND** 保存題目但標記需要人工复核
