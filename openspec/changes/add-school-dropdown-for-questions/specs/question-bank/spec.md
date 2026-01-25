## MODIFIED Requirements

### Requirement: 題目錄入和導入
係統SHALL支持手動錄入和批量導入題目,但不自動導入種子數據。學校字段必须通過數據庫學校列表進行選擇。

#### Scenario: 係統初始化不自動導入題目
- **WHEN** 係統首次启動或重启
- **THEN** 數據庫表結构正確創建
- **AND** 不自動導入任何種子題目數據
- **AND** 題庫为空,等待用户手動生成或導入

#### Scenario: 手動触發種子數據導入(可選)
- **WHEN** 用户通過API調用 POST /api/data/seed-questions
- **THEN** 係統導入预定义的種子題目
- **AND** 检查是否已存在相同題目(基于question_text)
- **AND** 跳過已存在的題目,只導入新題目
- **AND** 返回導入統計(新增數、跳過數)

#### Scenario: 推荐通過AI生成題目
- **WHEN** 用户需要題目進行練習
- **THEN** 係統推荐用户使用AI生成題目功能(POST /api/ai/generate-questions)
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

## ADDED Requirements

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
