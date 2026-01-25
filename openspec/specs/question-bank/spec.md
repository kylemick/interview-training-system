# Capability: Question Bank (題庫管理)

## Purpose

題庫管理能力为香港升中面試訓練係統提供題目的存储、管理和生成功能。支持七大專項類別（英文口語、中文表達、邏輯思維、時事常識、科學常識、个人成長、小組討論），通過AI自動生成和手動導入相結合的方式构建題庫，并提供查询、筛選、統計等功能以優化練習效果。
## Requirements
### Requirement: 題目數據模型
係統SHALL定义標準化的題目數據結构，支持七大專項類別。

#### Scenario: 存储題目元數據
- **WHEN** 係統創建或導入題目
- **THEN** 每道題目包含：唯一ID、專項類別、難度等级、學校標籤、題目文本、參考答案、評分標準
- **AND** 可選字段：創建時間、來源（手動/AI生成）、使用次數、平均得分

#### Scenario: 七大專項類別定义
- **WHEN** 係統初始化題庫
- **THEN** 支持以下類別：`english-oral`（英文口語）、`chinese-oral`（中文表達）、`logic-thinking`（邏輯思維）、`current-affairs`（時事常識）、`science-knowledge`（科學常識）、`personal-growth`（个人成長）、`group-discussion`（小組討論）
- **AND** 每个類別有清晰的描述和示例題目

### Requirement: 題目錄入和導入
係統SHALL支持手動錄入和批量導入題目，但不自動導入種子數據。學校字段必须通過數據庫學校列表進行選擇。

#### Scenario: 係統初始化不自動導入題目
- **WHEN** 係統首次启動或重启
- **THEN** 數據庫表結构正確創建
- **AND** 不自動導入任何種子題目數據
- **AND** 題庫为空，等待用户手動生成或導入

#### Scenario: 手動触發種子數據導入（可選）
- **WHEN** 用户通過API調用 POST /api/data/seed-questions
- **THEN** 係統導入预定义的種子題目
- **AND** 检查是否已存在相同題目（基于question_text）
- **AND** 跳過已存在的題目，只導入新題目
- **AND** 返回導入統計（新增數、跳過數）

#### Scenario: 推荐通過AI生成題目
- **WHEN** 用户需要題目進行練習
- **THEN** 係統推荐用户使用AI生成題目功能（POST /api/ai/generate-questions）
- **AND** 而不是依赖预置的種子數據
- **AND** AI生成的題目更加多樣化和个性化

#### Scenario: 手動創建題目時選擇學校
- **WHEN** 用户在前端界面手動創建或编輯題目
- **THEN** school_code字段必须提供下拉選擇器
- **AND** 下拉選擇器選項從數據庫`school_profiles`表实時获取
- **AND** 显示學校中文名称(name_zh),值为學校代碼(code)
- **AND** 允许用户選擇"不指定學校"(空值)
- **AND** 不允许用户手動输入任意文本作为學校代碼

#### Scenario: AI生成題目時選擇目標學校
- **WHEN** 用户使用AI生成題目功能
- **THEN** school_code字段必须提供下拉選擇器
- **AND** 下拉選擇器選項從數據庫`school_profiles`表实時获取
- **AND** 用户可選擇目標學校或不指定
- **AND** 選中的學校代碼傳递给AI生成接口,用于生成針對性題目

### Requirement: 題目查询和筛選
係統SHALL提供灵活的題目查询功能。

#### Scenario: 按類別查询題目
- **WHEN** 用户查询特定類別的題目（如"english-oral"）
- **THEN** 返回该類別的所有題目列表
- **AND** 显示每題的ID、難度、简短文本预览

#### Scenario: 按學校標籤筛選
- **WHEN** 用户指定目標學校（如"SPCC"）查询題目
- **THEN** 返回標記为该學校相關或适用于该校的題目
- **AND** 優先显示该校真題或高相關題目

#### Scenario: 按難度筛選
- **WHEN** 用户指定難度范围（如"3-5"）查询題目
- **THEN** 返回難度在该范围內的題目
- **AND** 可結合類別和學校標籤進行多条件筛選

#### Scenario: 随机選題
- **WHEN** 係統需要为練習會話選擇題目
- **THEN** 根據筛選条件（類別、難度、學校）随机選擇題目
- **AND** 避免短期內重复（如最近10次會話未使用）
- **AND** 優先選擇用户表现较弱的子類別題目

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

### Requirement: 題目质量管理
係統SHALL支持題目的評價、编輯和删除。

#### Scenario: 编輯題目內容
- **WHEN** 用户發现題目有误或需要優化
- **THEN** 用户可编輯題目的任意字段（文本、難度、標籤等）
- **AND** 係統保存修改历史（修改時間、修改人）
- **AND** 已使用该題的历史會話保留原題目快照

#### Scenario: 標記題目质量
- **WHEN** 用户或係統評估題目质量
- **THEN** 可對題目標記质量標籤（優秀/良好/需改進）
- **AND** 選題時優先選擇"優秀"和"良好"題目
- **AND** "需改進"題目不自動選用，仅供手動查看和修正

#### Scenario: 删除低质量題目
- **WHEN** 用户删除題目
- **THEN** 係統標記題目为"已删除"而非物理删除
- **AND** 历史會話中的该題記錄保留但注明"題目已下架"
- **AND** 删除的題目不再出现在選題池中

### Requirement: 題目統計和分析
係統SHALL收集題目使用數據以優化題庫。

#### Scenario: 統計題目使用频率
- **WHEN** 查看題庫統計數據
- **THEN** 显示每道題的使用次數、最後使用時間
- **AND** 識別長期未使用的題目（如>30天未使用）
- **AND** 建議补充或生成新題

#### Scenario: 統計題目平均表现
- **WHEN** 題目被使用多次後
- **THEN** 計算该題的平均得分和答題時長
- **AND** 識別過難（平均分<50%）或過易（平均分>90%）的題目
- **AND** 建議調整難度標籤或題目內容

### Requirement: 數據去重
係統SHALL確保題庫中不存在完全相同的題目。

#### Scenario: 防止導入重复題目
- **WHEN** 係統導入題目（種子數據或批量導入）
- **THEN** 检查question_text是否已存在
- **AND** 如果已存在，跳過该題目
- **AND** 記錄日志說明跳過原因

#### Scenario: 清理现有重复數據
- **WHEN** 數據庫中存在重复題目
- **THEN** 提供數據清理脚本或API
- **AND** 保留每个唯一題目的最早一条記錄
- **AND** 删除其他重复記錄
- **AND** 記錄清理日志（删除數量）

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

### Requirement: 學校列表获取接口
係統SHALL提供接口供前端获取有效的學校列表,用于題目創建時的下拉選擇。

#### Scenario: 前端获取學校列表
- **WHEN** 前端加载題目創建/编輯界面
- **THEN** 調用 GET /api/schools 获取所有學校檔案
- **AND** 接口返回學校列表,包含 code, name, name_zh 字段
- **AND** 前端使用返回的數據填充下拉選擇器

#### Scenario: 學校列表实時更新
- **WHEN** 管理员在學校檔案页面新增或修改學校
- **THEN** 題目創建界面的學校下拉列表应能获取最新數據
- **AND** 用户刷新页面或重新打開創建界面時加载最新學校列表

