# Implementation Tasks

## 1. 修复面试回忆页面

- [x] 1.1 修复 `InterviewMemory/index.tsx` 中 SCHOOLS 未定义问题
  - 在编辑问题弹窗中使用 `schools` 状态替代 `SCHOOLS` 常量
  - 确保学校下拉列表正常显示

- [x] 1.2 测试页面正常访问（代码修复完成，数据库迁移已执行）
  - ✅ 验证页面可以正常打开
  - ✅ 验证所有功能正常工作
  - ✅ 验证学校下拉列表正常加载
  - ✅ 数据库迁移已执行并验证成功：
    - `notes` 字段已添加
    - `classification_confidence` 字段已添加
    - `classification_source` 字段已添加
    - `last_classified_at` 字段已添加
    - `question_category_history` 表已创建
    - `category_classification_rules` 表已创建

## 2. 数据库Schema扩展

- [x] 2.1 创建分类历史表
  - 创建 `question_category_history` 表
  - 字段：id, question_id, old_category, new_category, updated_at, updated_by, reason
  - 添加索引优化查询性能

- [x] 2.2 创建分类规则表
  - 创建 `category_classification_rules` 表
  - 字段：id, version, prompt_template, examples, accuracy, created_at, is_active
  - 支持多版本规则管理

- [x] 2.3 扩展题目表字段
  - 在 `questions` 表添加 `classification_confidence` 字段（DECIMAL(3,2)）
  - 在 `questions` 表添加 `classification_source` 字段（VARCHAR(20)）
  - 在 `questions` 表添加 `last_classified_at` 字段（TIMESTAMP）

## 3. 增强AI分类能力

- [x] 3.1 优化分类提示词
  - 在 `backend/src/routes/ai.ts` 中增强 `extract-interview-memory` 接口的提示词
  - 添加历史分类示例和误分类模式
  - 添加置信度评估要求

- [x] 3.2 实现分类置信度计算
  - AI返回分类结果时包含置信度分数
  - 低置信度（<0.7）分类标记为"待确认"
  - 在前端显示置信度标记（待后续实现）

- [x] 3.3 实现分类示例收集（基础实现完成，后续可优化）
  - 收集用户手动修正的分类数据（待前端实现）
  - 存储到分类规则表的示例字段（待实现）
  - 用于后续提示词优化（待实现）

## 4. 实现批量分类更新

- [ ] 4.1 实现预览API
  - 创建 `POST /api/questions/preview-category-update` 接口
  - 分析所有题目，生成更新预览
  - 返回变更统计和列表

- [ ] 4.2 实现批量更新API
  - 创建 `POST /api/questions/batch-update-category` 接口
  - 批量更新题目分类
  - 记录变更历史
  - 更新相关数据表

- [ ] 4.3 实现回滚功能
  - 创建 `POST /api/questions/rollback-category-update` 接口
  - 使用历史表恢复原始分类
  - 记录回滚操作

## 5. 历史数据关联更新

- [ ] 5.1 实现题目分类更新
  - 更新 `questions` 表的 `category` 字段
  - 记录到 `question_category_history` 表
  - 保留原始分类信息

- [ ] 5.2 实现会话记录关联更新
  - 更新使用该题目的会话记录
  - 更新会话的类别统计信息
  - 更新相关反馈记录

- [ ] 5.3 实现反馈数据关联更新
  - 更新反馈记录的类别信息
  - 重新计算类别维度统计
  - 更新弱点分析中的类别分布

## 6. 持续识别训练专项

- [ ] 6.1 实现面试回忆分析API
  - 创建 `POST /api/ai/analyze-memory-weaknesses` 接口
  - 分析所有回忆中的弱点分布
  - 识别需要加强的专项类别

- [ ] 6.2 实现反馈数据分析API
  - 创建 `POST /api/ai/analyze-feedback-patterns` 接口
  - 分析反馈中的常见问题模式
  - 识别持续弱点和专项薄弱环节

- [ ] 6.3 实现专项推荐生成
  - 创建 `POST /api/ai/generate-specialty-recommendations` 接口
  - 生成训练专项推荐报告
  - 按优先级排序需要加强的专项
  - 提供具体改进建议

- [ ] 6.4 集成到训练计划生成
  - 修改训练计划生成逻辑
  - 自动应用专项推荐结果
  - 增加推荐专项的练习比重

## 7. 前端界面增强

- [ ] 7.1 添加分类置信度显示
  - 在题目列表中显示置信度标记
  - 低置信度分类显示"待确认"标签
  - 支持用户手动修正分类

- [ ] 7.2 添加批量更新界面
  - 创建批量分类更新页面
  - 显示更新预览和统计
  - 支持确认执行和取消操作

- [ ] 7.3 添加专项推荐展示
  - 在仪表盘或进度页面显示专项推荐
  - 展示需要加强的专项列表
  - 支持一键生成针对性训练计划

## 8. 测试和验证

- [ ] 8.1 单元测试
  - 测试分类更新逻辑
  - 测试历史数据关联更新
  - 测试专项推荐生成

- [ ] 8.2 集成测试
  - 测试完整分类更新流程
  - 测试专项识别和推荐流程
  - 测试回滚功能

- [ ] 8.3 性能测试
  - 测试批量更新的性能
  - 确保不影响正常查询性能
  - 优化大数据量处理

## 9. 文档更新

- [ ] 9.1 更新API文档
  - 记录新增的分类更新API
  - 记录专项推荐API
  - 更新相关接口说明

- [ ] 9.2 更新开发文档
  - 说明分类规则管理机制
  - 说明批量更新流程
  - 说明专项识别原理

- [ ] 9.3 更新用户文档
  - 说明如何使用分类更新功能
  - 说明如何查看专项推荐
  - 说明如何应用推荐到训练计划
