## ADDED Requirements

### Requirement: 前端页面性能要求
前端页面 SHALL 在本地环境下首次加载時間不超過 1 秒，页面刷新後能正常加载所有數據。

#### Scenario: Dashboard 页面快速加载
- **WHEN** 用户访問 Dashboard 页面
- **THEN** 页面在 1 秒內完成初始渲染和數據加载
- **AND** 所有 API 请求并行执行，不阻塞页面渲染

#### Scenario: 页面刷新後正常加载
- **WHEN** 用户刷新任何页面
- **THEN** 页面能正常加载所有數據
- **AND** 不會出现數據丢失或显示错误

### Requirement: API 请求優化
前端 SHALL 实现请求去重、请求取消和简单缓存机制，避免重复请求和資源浪费。

#### Scenario: 请求去重
- **WHEN** 同一 API 请求在短時間內被多次調用（相同 URL 和參數）
- **THEN** 只發送一次请求，其他調用共享結果
- **AND** 请求完成後通知所有等待的調用者

#### Scenario: 请求取消
- **WHEN** 組件卸载時仍有未完成的 API 请求
- **THEN** 自動取消这些请求
- **AND** 避免內存泄漏和错误狀態更新

#### Scenario: 请求缓存
- **WHEN** API 请求成功返回數據
- **THEN** 将結果缓存 5 分鐘
- **AND** 相同请求在缓存有效期內直接返回缓存結果
- **AND** 數據变更操作（創建、更新、删除）後清除相關缓存

### Requirement: React 性能優化
前端組件 SHALL 使用 React.memo、useMemo 和 useCallback 優化渲染性能，避免不必要的重新渲染。

#### Scenario: 列表組件優化
- **WHEN** 列表組件接收相同的數據
- **THEN** 使用 React.memo 避免不必要的重新渲染
- **AND** 列表項使用唯一 key 属性

#### Scenario: 計算和回調優化
- **WHEN** 組件包含昂贵的計算或回調函數
- **THEN** 使用 useMemo 缓存計算結果
- **AND** 使用 useCallback 缓存回調函數引用

### Requirement: API 超時设置
API 请求 SHALL 设置合理的超時時間，避免長時間等待。

#### Scenario: API 超時
- **WHEN** API 请求超過 10 秒未响应
- **THEN** 自動取消请求并显示错误提示
- **AND** 用户可以手動重試

### Requirement: 错误重試机制
前端 SHALL 实现错误重試机制，在网络错误或服務器错误時自動重試。

#### Scenario: 网络错误重試
- **WHEN** API 请求因网络错误或服務器错误（5xx）失敗
- **THEN** 自動重試 1 次（使用指數退避策略）
- **AND** 客户端错误（4xx）不重試
- **AND** 取消的请求不重試
