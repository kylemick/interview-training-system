# Capability: Question Bank (題庫管理)

## MODIFIED Requirements

### Requirement: 題目錄入和導入
係統SHALL支持手動錄入和批量導入題目，但不自動導入種子數據。

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
