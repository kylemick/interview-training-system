# Implementation Tasks

## 1. 數據清理
- [x] 1.1 備份当前數據庫
- [x] 1.2 编写SQL清理重复題目（保留每个題目的最早一条記錄）
- [x] 1.3 执行數據清理
- [x] 1.4 验证清理後的數據（每个題目只有一条）

## 2. 移除自動導入邏輯
- [x] 2.1 修改 backend/src/db/index.ts 的 initDatabase() 函數
- [x] 2.2 移除 seedSchoolProfiles() 和 seedQuestions() 的自動調用
- [x] 2.3 保留日志說明"種子數據不再自動導入"

## 3. 保留手動導入API
- [x] 3.1 確认 backend/src/routes/data.ts 的API仍然可用
- [x] 3.2 添加防重复检查（如果已存在相同題目，跳過）
- [x] 3.3 更新API文檔說明手動導入的用途

## 4. 测試和验证
- [x] 4.1 测試重启服務不會重复導入數據
- [x] 4.2 测試手動調用 /api/data/seed-schools 和 /api/data/seed-questions
- [x] 4.3 测試AI生成題目功能正常
- [x] 4.4 验证數據庫統計信息正確

## 5. 文檔更新
- [ ] 5.1 更新README說明不再自動導入種子數據
- [ ] 5.2 說明用户应通過AI生成題目
- [ ] 5.3 說明手動導入API的使用场景（仅用于测試或恢复）
