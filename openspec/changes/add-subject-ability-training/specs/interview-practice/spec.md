# Capability: Interview Practice (面試練習)

## MODIFIED Requirements

### Requirement: 启動練習會話
係統SHALL支持启動包含七大專項類別和四个學科能力類別的練習會話。

#### Scenario: 選擇專項類別启動練習
- **WHEN** 用户選擇專項類別（如"english-oral"）启動練習
- **THEN** 係統創建練習會話，從題庫中選擇该類別的題目
- **AND** 支持七大專項類別：`english-oral`、`chinese-oral`、`logic-thinking`、`current-affairs`、`science-knowledge`、`personal-growth`、`group-discussion`
- **AND** 支持四个學科能力類別：`chinese-reading`、`english-reading`、`mathematics`、`science-practice`

#### Scenario: 選擇學科能力類別启動練習
- **WHEN** 用户選擇學科能力類別（如"chinese-reading"）启動練習
- **THEN** 係統創建練習會話，從題庫中選擇该學科能力類別的題目
- **AND** 對于阅读理解類別，係統提供完整的文章和問題列表
- **AND** 對于數學和科學類別，係統提供題目和答題界面

## ADDED Requirements

### Requirement: 學科能力練習模式
係統SHALL支持學科能力類別的專门練習模式。

#### Scenario: 中文阅读理解練習
- **WHEN** 用户選擇 `chinese-reading` 類別進行練習
- **THEN** 係統显示阅读文章（200-500字）
- **AND** 用户阅读文章後，係統依次显示阅读理解問題
- **AND** 問題類型包括：文章主旨、细节理解、字詞解释、觀點提炼
- **AND** 用户提交答案後，係統提供详细反馈，包括參考答案和評分

#### Scenario: 英文阅读理解練習
- **WHEN** 用户選擇 `english-reading` 類別進行練習
- **THEN** 係統显示英文阅读文章（150-400字，全英文）
- **AND** 用户阅读文章後，係統依次显示英文阅读理解問題（全英文）
- **AND** 問題類型包括：文章主旨、细节理解、詞汇解释、觀點分析
- **AND** 用户提交答案後，係統提供英文反馈，包括參考答案和評分

#### Scenario: 數學基础練習
- **WHEN** 用户選擇 `mathematics` 類別進行練習
- **THEN** 係統显示數學題目（計算題、概念題、应用題）
- **AND** 用户可以在答題界面输入答案或解題過程
- **AND** 係統支持文字输入和可能的數學公式输入
- **AND** 用户提交答案後，係統提供详细反馈，包括解題步骤、計算方法和答案验证

#### Scenario: 科學实践練習
- **WHEN** 用户選擇 `science-practice` 類別進行練習
- **THEN** 係統显示科學題目（现象說明、推理題、行为題）
- **AND** 題目結合生活实际，适合小學生理解
- **AND** 用户提交答案後，係統提供详细反馈，包括科學原理解释、推理過程、实际应用

### Requirement: 學科能力題目展示
係統SHALL为學科能力類別提供專门的題目展示界面。

#### Scenario: 阅读理解題目展示
- **WHEN** 練習會話包含阅读理解題目
- **THEN** 文章內容完整显示，支持滚動查看
- **AND** 問題依次显示，用户完成一題後显示下一題
- **AND** 支持返回查看文章內容

#### Scenario: 數學和科學題目展示
- **WHEN** 練習會話包含數學或科學題目
- **THEN** 題目清晰显示，包含必要的图表或說明
- **AND** 答題界面支持文字输入和可能的公式输入
- **AND** 支持多步骤答題過程
