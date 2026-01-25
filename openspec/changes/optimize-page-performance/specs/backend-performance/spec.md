## ADDED Requirements

### Requirement: 後端 API 性能要求
後端 API SHALL 在本地环境下响应時間不超過 500ms（简单查询），复杂查询不超過 2 秒。

#### Scenario: 简单查询快速响应
- **WHEN** 客户端请求简单數據（如获取单个資源、列表查询）
- **THEN** API 在 500ms 內返回响应
- **AND** 响应包含正確的數據格式

#### Scenario: 复杂查询合理响应
- **WHEN** 客户端请求复杂數據（如統計查询、多表 JOIN）
- **THEN** API 在 2 秒內返回响应
- **AND** 如果查询時間超過 1 秒，記錄性能日志

### Requirement: 數據庫查询優化
數據庫查询 SHALL 使用适当的索引，避免全表扫描和慢查询。

#### Scenario: 索引使用
- **WHEN** 执行包含 WHERE、JOIN 或 ORDER BY 的查询
- **THEN** 查询使用适当的索引
- **AND** 不使用全表扫描（除非數據量很小）

#### Scenario: 分页查询優化
- **WHEN** 执行分页查询
- **THEN** 使用 LIMIT 和 OFFSET 限制結果數量
- **AND** 使用索引優化排序和筛選

### Requirement: 查询結果缓存
後端 SHALL 對频繁访問的查询結果進行缓存，减少數據庫压力。

#### Scenario: 缓存命中
- **WHEN** 请求已缓存的數據（如學校列表、統計信息）
- **THEN** 直接返回缓存結果
- **AND** 不执行數據庫查询

#### Scenario: 缓存失效
- **WHEN** 相關數據發生变更（創建、更新、删除）
- **THEN** 清除相關缓存
- **AND** 下次请求時重新查询并更新缓存

### Requirement: JSON 字段解析優化
後端 SHALL 在數據庫访問层統一解析 JSON 字段，避免在路由层重复解析。

#### Scenario: JSON 字段解析
- **WHEN** 查询包含 JSON 字段的數據
- **THEN** 在數據庫访問层統一解析
- **AND** 路由层直接使用解析後的數據
- **AND** 解析错误統一处理，不影响其他字段

### Requirement: 查询性能监控
後端 SHALL 記錄慢查询日志，帮助識別性能瓶颈。

#### Scenario: 慢查询記錄
- **WHEN** 數據庫查询执行時間超過 100ms
- **THEN** 記錄查询 SQL、參數和执行時間
- **AND** 在開發环境下输出到控制台
- **AND** 在生产环境下記錄到日志文件
