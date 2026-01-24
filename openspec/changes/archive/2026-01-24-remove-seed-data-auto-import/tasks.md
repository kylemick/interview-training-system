# Implementation Tasks

## 1. 数据清理
- [x] 1.1 备份当前数据库
- [x] 1.2 编写SQL清理重复题目（保留每个题目的最早一条记录）
- [x] 1.3 执行数据清理
- [x] 1.4 验证清理后的数据（每个题目只有一条）

## 2. 移除自动导入逻辑
- [x] 2.1 修改 backend/src/db/index.ts 的 initDatabase() 函数
- [x] 2.2 移除 seedSchoolProfiles() 和 seedQuestions() 的自动调用
- [x] 2.3 保留日志说明"种子数据不再自动导入"

## 3. 保留手动导入API
- [x] 3.1 确认 backend/src/routes/data.ts 的API仍然可用
- [x] 3.2 添加防重复检查（如果已存在相同题目，跳过）
- [x] 3.3 更新API文档说明手动导入的用途

## 4. 测试和验证
- [x] 4.1 测试重启服务不会重复导入数据
- [x] 4.2 测试手动调用 /api/data/seed-schools 和 /api/data/seed-questions
- [x] 4.3 测试AI生成题目功能正常
- [x] 4.4 验证数据库统计信息正确

## 5. 文档更新
- [ ] 5.1 更新README说明不再自动导入种子数据
- [ ] 5.2 说明用户应通过AI生成题目
- [ ] 5.3 说明手动导入API的使用场景（仅用于测试或恢复）
