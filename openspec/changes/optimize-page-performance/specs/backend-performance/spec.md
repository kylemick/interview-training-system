## ADDED Requirements

### Requirement: 后端 API 性能要求
后端 API SHALL 在本地环境下响应时间不超过 500ms（简单查询），复杂查询不超过 2 秒。

#### Scenario: 简单查询快速响应
- **WHEN** 客户端请求简单数据（如获取单个资源、列表查询）
- **THEN** API 在 500ms 内返回响应
- **AND** 响应包含正确的数据格式

#### Scenario: 复杂查询合理响应
- **WHEN** 客户端请求复杂数据（如统计查询、多表 JOIN）
- **THEN** API 在 2 秒内返回响应
- **AND** 如果查询时间超过 1 秒，记录性能日志

### Requirement: 数据库查询优化
数据库查询 SHALL 使用适当的索引，避免全表扫描和慢查询。

#### Scenario: 索引使用
- **WHEN** 执行包含 WHERE、JOIN 或 ORDER BY 的查询
- **THEN** 查询使用适当的索引
- **AND** 不使用全表扫描（除非数据量很小）

#### Scenario: 分页查询优化
- **WHEN** 执行分页查询
- **THEN** 使用 LIMIT 和 OFFSET 限制结果数量
- **AND** 使用索引优化排序和筛选

### Requirement: 查询结果缓存
后端 SHALL 对频繁访问的查询结果进行缓存，减少数据库压力。

#### Scenario: 缓存命中
- **WHEN** 请求已缓存的数据（如学校列表、统计信息）
- **THEN** 直接返回缓存结果
- **AND** 不执行数据库查询

#### Scenario: 缓存失效
- **WHEN** 相关数据发生变更（创建、更新、删除）
- **THEN** 清除相关缓存
- **AND** 下次请求时重新查询并更新缓存

### Requirement: JSON 字段解析优化
后端 SHALL 在数据库访问层统一解析 JSON 字段，避免在路由层重复解析。

#### Scenario: JSON 字段解析
- **WHEN** 查询包含 JSON 字段的数据
- **THEN** 在数据库访问层统一解析
- **AND** 路由层直接使用解析后的数据
- **AND** 解析错误统一处理，不影响其他字段

### Requirement: 查询性能监控
后端 SHALL 记录慢查询日志，帮助识别性能瓶颈。

#### Scenario: 慢查询记录
- **WHEN** 数据库查询执行时间超过 100ms
- **THEN** 记录查询 SQL、参数和执行时间
- **AND** 在开发环境下输出到控制台
- **AND** 在生产环境下记录到日志文件
