# 实现任務清单

## 1. 數據庫设計
- [x] 1.1 創建數據庫迁移脚本：`learning_materials` 表
- [x] 1.2 添加必要的索引和外键约束
- [x] 1.3 更新數據庫Schema文檔

## 2. 後端API实现

### 2.1 學習素材路由
- [x] 2.1 創建 `routes/learningMaterials.ts` 文件
- [x] 2.2 实现 `GET /api/learning-materials` - 获取素材列表（支持筛選、分页）
- [x] 2.3 实现 `GET /api/learning-materials/:id` - 获取素材详情
- [x] 2.4 实现 `POST /api/learning-materials` - 創建素材（手動）
- [x] 2.5 实现 `PUT /api/learning-materials/:id` - 更新素材
- [x] 2.6 实现 `DELETE /api/learning-materials/:id` - 删除素材
- [x] 2.7 实现 `GET /api/learning-materials/by-weakness/:weaknessId` - 获取弱點關聯的素材

### 2.2 AI生成素材API
- [x] 2.8 在 `routes/ai.ts` 中实现 `POST /api/ai/generate-learning-material`
- [x] 2.9 創建 `ai/materialGenerator.ts` - AI素材生成服務
- [x] 2.10 实现基于弱點的素材生成邏輯
- [x] 2.11 支持不同素材類型（text, example, tip, practice）
- [x] 2.12 处理AI响应和错误处理

## 3. 前端页面实现

### 3.1 學習素材管理页面
- [x] 3.1 創建 `pages/LearningMaterials/index.tsx`
- [x] 3.2 实现素材列表视图（表格/卡片）
- [x] 3.3 实现筛選功能（弱點、類別、類型、標籤）
- [x] 3.4 实现搜索功能
- [x] 3.5 实现分页功能
- [x] 3.6 实现素材详情页面
- [x] 3.7 实现內容渲染（文本格式，支持Markdown格式显示）
- [x] 3.8 实现創建/编輯素材表单
- [x] 3.9 实现删除確认對話框

### 3.2 弱點页面增强
- [x] 3.10 在弱點详情页面添加"生成學習素材"按钮
- [x] 3.11 实现生成素材對話框（選擇素材類型）
- [x] 3.12 显示弱點關聯的素材列表
- [x] 3.13 添加跳转到素材详情的链接
- [x] 3.14 实现素材快速预览

### 3.3 練習页面集成
- [x] 3.15 在練習選擇页面添加"弱點專項練習"模式
- [x] 3.16 实现弱點和素材選擇器
- [x] 3.17 在練習過程中显示相關素材提示
- [x] 3.18 在反馈中結合素材给出建議
- [x] 3.19 記錄素材使用次數

## 4. API工具函數
- [x] 4.1 在 `utils/api.ts` 中添加 `learningMaterials` API方法
- [x] 4.2 实现所有CRUD操作的API調用
- [x] 4.3 实现AI生成素材的API調用

## 5. 路由和導航
- [x] 5.1 在 `App.tsx` 中添加學習素材路由
- [x] 5.2 在 `Layout.tsx` 中添加學習素材菜单項
- [x] 5.3 添加從弱點页面到素材页面的導航

## 6. 樣式和UI
- [x] 6.1 设計素材卡片樣式
- [x] 6.2 实现內容渲染樣式（文本格式，支持Markdown格式显示）
- [x] 6.3 優化素材列表和详情页面的布局
- [x] 6.4 添加加载狀態和错误处理UI

## 7. 测試和验证
- [ ] 7.1 测試素材CRUD操作
- [ ] 7.2 测試AI生成素材功能
- [ ] 7.3 测試弱點与素材的關聯
- [ ] 7.4 测試練習页面集成
- [ ] 7.5 测試筛選和搜索功能
- [ ] 7.6 验证數據完整性

## 8. 文檔更新
- [ ] 8.1 更新API文檔（新增學習素材接口）
- [ ] 8.2 更新數據庫Schema文檔
- [ ] 8.3 更新用户使用指南
- [ ] 8.4 在項目文檔中記錄新功能
