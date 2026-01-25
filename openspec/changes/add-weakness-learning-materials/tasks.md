# 实现任务清单

## 1. 数据库设计
- [x] 1.1 创建数据库迁移脚本：`learning_materials` 表
- [x] 1.2 添加必要的索引和外键约束
- [x] 1.3 更新数据库Schema文档

## 2. 后端API实现

### 2.1 学习素材路由
- [x] 2.1 创建 `routes/learningMaterials.ts` 文件
- [x] 2.2 实现 `GET /api/learning-materials` - 获取素材列表（支持筛选、分页）
- [x] 2.3 实现 `GET /api/learning-materials/:id` - 获取素材详情
- [x] 2.4 实现 `POST /api/learning-materials` - 创建素材（手动）
- [x] 2.5 实现 `PUT /api/learning-materials/:id` - 更新素材
- [x] 2.6 实现 `DELETE /api/learning-materials/:id` - 删除素材
- [x] 2.7 实现 `GET /api/learning-materials/by-weakness/:weaknessId` - 获取弱点关联的素材

### 2.2 AI生成素材API
- [x] 2.8 在 `routes/ai.ts` 中实现 `POST /api/ai/generate-learning-material`
- [x] 2.9 创建 `ai/materialGenerator.ts` - AI素材生成服务
- [x] 2.10 实现基于弱点的素材生成逻辑
- [x] 2.11 支持不同素材类型（text, example, tip, practice）
- [x] 2.12 处理AI响应和错误处理

## 3. 前端页面实现

### 3.1 学习素材管理页面
- [x] 3.1 创建 `pages/LearningMaterials/index.tsx`
- [x] 3.2 实现素材列表视图（表格/卡片）
- [x] 3.3 实现筛选功能（弱点、类别、类型、标签）
- [x] 3.4 实现搜索功能
- [x] 3.5 实现分页功能
- [x] 3.6 实现素材详情页面
- [x] 3.7 实现内容渲染（文本格式，支持Markdown格式显示）
- [x] 3.8 实现创建/编辑素材表单
- [x] 3.9 实现删除确认对话框

### 3.2 弱点页面增强
- [x] 3.10 在弱点详情页面添加"生成学习素材"按钮
- [x] 3.11 实现生成素材对话框（选择素材类型）
- [x] 3.12 显示弱点关联的素材列表
- [x] 3.13 添加跳转到素材详情的链接
- [x] 3.14 实现素材快速预览

### 3.3 练习页面集成
- [x] 3.15 在练习选择页面添加"弱点专项练习"模式
- [x] 3.16 实现弱点和素材选择器
- [x] 3.17 在练习过程中显示相关素材提示
- [x] 3.18 在反馈中结合素材给出建议
- [x] 3.19 记录素材使用次数

## 4. API工具函数
- [x] 4.1 在 `utils/api.ts` 中添加 `learningMaterials` API方法
- [x] 4.2 实现所有CRUD操作的API调用
- [x] 4.3 实现AI生成素材的API调用

## 5. 路由和导航
- [x] 5.1 在 `App.tsx` 中添加学习素材路由
- [x] 5.2 在 `Layout.tsx` 中添加学习素材菜单项
- [x] 5.3 添加从弱点页面到素材页面的导航

## 6. 样式和UI
- [x] 6.1 设计素材卡片样式
- [x] 6.2 实现内容渲染样式（文本格式，支持Markdown格式显示）
- [x] 6.3 优化素材列表和详情页面的布局
- [x] 6.4 添加加载状态和错误处理UI

## 7. 测试和验证
- [ ] 7.1 测试素材CRUD操作
- [ ] 7.2 测试AI生成素材功能
- [ ] 7.3 测试弱点与素材的关联
- [ ] 7.4 测试练习页面集成
- [ ] 7.5 测试筛选和搜索功能
- [ ] 7.6 验证数据完整性

## 8. 文档更新
- [ ] 8.1 更新API文档（新增学习素材接口）
- [ ] 8.2 更新数据库Schema文档
- [ ] 8.3 更新用户使用指南
- [ ] 8.4 在项目文档中记录新功能
