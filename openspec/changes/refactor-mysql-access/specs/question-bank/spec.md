# Capability: Question Bank (题库管理)

## MODIFIED Requirements

### Requirement: 题目查询和筛选
系统SHALL提供灵活的题目查询功能，并确保查询参数类型正确。

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

#### Scenario: 分页查询题目列表
- **WHEN** 用户请求题目列表并指定分页参数（limit 和 offset）
- **THEN** 系统将 limit 和 offset 转换为正确的 SQL 参数类型
- **AND** 返回指定范围的题目列表
- **AND** 包含总数、当前页范围等分页元数据
- **AND** limit 默认为 50，最大不超过 100
- **AND** offset 默认为 0

#### Scenario: 随机选题
- **WHEN** 系统需要为练习会话选择题目
- **THEN** 根据筛选条件（类别、难度、学校）随机选择题目
- **AND** 避免短期内重复（如最近10次会话未使用）
- **AND** 优先选择用户表现较弱的子类别题目

## ADDED Requirements

### Requirement: SQL 参数类型规范
系统SHALL确保所有数据库查询使用正确的参数类型。

#### Scenario: 数值参数传递给 MySQL
- **WHEN** 执行包含 LIMIT、OFFSET 等数值参数的 SQL 查询
- **THEN** 系统将 number 类型的参数转换为字符串或确保类型兼容
- **AND** MySQL2 prepared statement 能正确接收参数
- **AND** 不产生 "Incorrect arguments to mysqld_stmt_execute" 错误

#### Scenario: 参数验证和日志记录
- **WHEN** 执行数据库查询前
- **THEN** 系统验证参数类型和有效性
- **AND** 记录查询 SQL、参数和类型信息到日志
- **AND** 便于调试和问题排查
