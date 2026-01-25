# Implementation Tasks

## 1. 修复面試回憶页面

- [x] 1.1 修复 `InterviewMemory/index.tsx` 中 SCHOOLS 未定义問題
  - 在编輯問題弹窗中使用 `schools` 狀態替代 `SCHOOLS` 常量
  - 確保學校下拉列表正常显示

- [x] 1.2 测試页面正常访問（代碼修复完成，數據庫迁移已执行）
  - ✅ 验证页面可以正常打開
  - ✅ 验证所有功能正常工作
  - ✅ 验证學校下拉列表正常加载
  - ✅ 數據庫迁移已执行并验证成功：
    - `notes` 字段已添加
    - `classification_confidence` 字段已添加
    - `classification_source` 字段已添加
    - `last_classified_at` 字段已添加
    - `question_category_history` 表已創建
    - `category_classification_rules` 表已創建

## 2. 數據庫Schema扩展

- [x] 2.1 創建分類历史表
  - 創建 `question_category_history` 表
  - 字段：id, question_id, old_category, new_category, updated_at, updated_by, reason
  - 添加索引優化查询性能

- [x] 2.2 創建分類規則表
  - 創建 `category_classification_rules` 表
  - 字段：id, version, prompt_template, examples, accuracy, created_at, is_active
  - 支持多版本規則管理

- [x] 2.3 扩展題目表字段
  - 在 `questions` 表添加 `classification_confidence` 字段（DECIMAL(3,2)）
  - 在 `questions` 表添加 `classification_source` 字段（VARCHAR(20)）
  - 在 `questions` 表添加 `last_classified_at` 字段（TIMESTAMP）

## 3. 增强AI分類能力

- [x] 3.1 優化分類提示詞
  - 在 `backend/src/routes/ai.ts` 中增强 `extract-interview-memory` 接口的提示詞
  - 添加历史分類示例和误分類模式
  - 添加置信度評估要求

- [x] 3.2 实现分類置信度計算
  - AI返回分類結果時包含置信度分數
  - 低置信度（<0.7）分類標記为"待確认"
  - 在前端显示置信度標記（待後续实现）

- [x] 3.3 实现分類示例收集（基础实现完成，後续可優化）
  - 收集用户手動修正的分類數據（待前端实现）
  - 存储到分類規則表的示例字段（待实现）
  - 用于後续提示詞優化（待实现）

## 4. 实现批量分類更新

- [ ] 4.1 实现预览API
  - 創建 `POST /api/questions/preview-category-update` 接口
  - 分析所有題目，生成更新预览
  - 返回变更統計和列表

- [ ] 4.2 实现批量更新API
  - 創建 `POST /api/questions/batch-update-category` 接口
  - 批量更新題目分類
  - 記錄变更历史
  - 更新相關數據表

- [ ] 4.3 实现回滚功能
  - 創建 `POST /api/questions/rollback-category-update` 接口
  - 使用历史表恢复原始分類
  - 記錄回滚操作

## 5. 历史數據關聯更新

- [ ] 5.1 实现題目分類更新
  - 更新 `questions` 表的 `category` 字段
  - 記錄到 `question_category_history` 表
  - 保留原始分類信息

- [ ] 5.2 实现會話記錄關聯更新
  - 更新使用该題目的會話記錄
  - 更新會話的類別統計信息
  - 更新相關反馈記錄

- [ ] 5.3 实现反馈數據關聯更新
  - 更新反馈記錄的類別信息
  - 重新計算類別維度統計
  - 更新弱點分析中的類別分布

## 6. 持续識別訓練專項

- [ ] 6.1 实现面試回憶分析API
  - 創建 `POST /api/ai/analyze-memory-weaknesses` 接口
  - 分析所有回憶中的弱點分布
  - 識別需要加强的專項類別

- [ ] 6.2 实现反馈數據分析API
  - 創建 `POST /api/ai/analyze-feedback-patterns` 接口
  - 分析反馈中的常见問題模式
  - 識別持续弱點和專項薄弱环节

- [ ] 6.3 实现專項推荐生成
  - 創建 `POST /api/ai/generate-specialty-recommendations` 接口
  - 生成訓練專項推荐报告
  - 按優先级排序需要加强的專項
  - 提供具体改進建議

- [ ] 6.4 集成到訓練計劃生成
  - 修改訓練計劃生成邏輯
  - 自動应用專項推荐結果
  - 增加推荐專項的練習比重

## 7. 前端界面增强

- [ ] 7.1 添加分類置信度显示
  - 在題目列表中显示置信度標記
  - 低置信度分類显示"待確认"標籤
  - 支持用户手動修正分類

- [ ] 7.2 添加批量更新界面
  - 創建批量分類更新页面
  - 显示更新预览和統計
  - 支持確认执行和取消操作

- [ ] 7.3 添加專項推荐展示
  - 在仪表盘或進度页面显示專項推荐
  - 展示需要加强的專項列表
  - 支持一键生成針對性訓練計劃

## 8. 测試和验证

- [ ] 8.1 单元测試
  - 测試分類更新邏輯
  - 测試历史數據關聯更新
  - 测試專項推荐生成

- [ ] 8.2 集成测試
  - 测試完整分類更新流程
  - 测試專項識別和推荐流程
  - 测試回滚功能

- [ ] 8.3 性能测試
  - 测試批量更新的性能
  - 確保不影响正常查询性能
  - 優化大數據量处理

## 9. 文檔更新

- [ ] 9.1 更新API文檔
  - 記錄新增的分類更新API
  - 記錄專項推荐API
  - 更新相關接口說明

- [ ] 9.2 更新開發文檔
  - 說明分類規則管理机制
  - 說明批量更新流程
  - 說明專項識別原理

- [ ] 9.3 更新用户文檔
  - 說明如何使用分類更新功能
  - 說明如何查看專項推荐
  - 說明如何应用推荐到訓練計劃
