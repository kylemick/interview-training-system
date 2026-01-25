# Capability: Question Bank (題庫管理)

## MODIFIED Requirements

### Requirement: 題目查询和筛選
係統SHALL提供灵活的題目查询功能，并確保查询參數類型正確。

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

#### Scenario: 分页查询題目列表
- **WHEN** 用户请求題目列表并指定分页參數（limit 和 offset）
- **THEN** 係統将 limit 和 offset 转换为正確的 SQL 參數類型
- **AND** 返回指定范围的題目列表
- **AND** 包含總數、当前页范围等分页元數據
- **AND** limit 默认为 50，最大不超過 100
- **AND** offset 默认为 0

#### Scenario: 随机選題
- **WHEN** 係統需要为練習會話選擇題目
- **THEN** 根據筛選条件（類別、難度、學校）随机選擇題目
- **AND** 避免短期內重复（如最近10次會話未使用）
- **AND** 優先選擇用户表现较弱的子類別題目

## ADDED Requirements

### Requirement: SQL 參數類型規范
係統SHALL確保所有數據庫查询使用正確的參數類型。

#### Scenario: 數值參數傳递给 MySQL
- **WHEN** 执行包含 LIMIT、OFFSET 等數值參數的 SQL 查询
- **THEN** 係統将 number 類型的參數转换为字符串或確保類型兼容
- **AND** MySQL2 prepared statement 能正確接收參數
- **AND** 不产生 "Incorrect arguments to mysqld_stmt_execute" 错误

#### Scenario: 參數验证和日志記錄
- **WHEN** 执行數據庫查询前
- **THEN** 係統验证參數類型和有效性
- **AND** 記錄查询 SQL、參數和類型信息到日志
- **AND** 便于調試和問題排查
