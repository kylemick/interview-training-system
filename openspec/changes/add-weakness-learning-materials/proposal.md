# Change: 添加弱点提升学习素材功能

## Why

当前系统中，弱点管理功能已经完整实现，用户可以查看弱点、生成针对性题目、创建训练计划。但是，在提升弱点的过程中，学生还需要：

1. **学习素材支持**：针对不同弱点类型，需要相关的学习资料、示例、技巧等素材来帮助理解和提升
2. **素材与练习结合**：练习时应该能够参考相关素材，让练习更有针对性
3. **AI生成素材**：利用AI能力自动为每个弱点生成个性化的学习素材，提高效率
4. **素材管理**：需要一个专门的页面来管理和查看所有学习素材

## What Changes

### 核心功能

#### 1. 学习素材管理页面
- 创建独立的学习素材管理页面 (`/learning-materials`)，提供完整的素材CRUD操作
- 素材列表页面：支持按弱点、类别、类型筛选、搜索、分页
- 素材详情页面：展示完整信息（内容、关联弱点、使用统计、创建时间等）
- 素材分类：按弱点类型分类（vocabulary, grammar, logic, knowledge_gap, confidence, expression）
- 素材类型：文本、链接、示例、技巧、练习建议等

#### 2. 弱点页面增强
- 在弱点详情页面添加"生成学习素材"按钮
- 使用AI自动生成针对该弱点的学习素材
- 显示该弱点关联的学习素材列表
- 快速跳转到素材详情或编辑

#### 3. AI生成学习素材
- 后端新增API：`POST /api/ai/generate-learning-material` - 基于弱点生成学习素材
- AI服务增强：分析弱点类型、严重程度、相关话题，生成个性化的学习素材
- 素材内容包括：
  - 知识点讲解
  - 常见错误示例
  - 改进技巧
  - 练习建议
  - 相关资源链接（可选）

#### 4. 练习页面集成
- 在练习页面支持选择弱点和关联素材
- 练习时显示相关素材提示
- 练习反馈中结合弱点和素材给出改进建议
- 支持"弱点专项练习"模式：基于选定弱点和素材生成题目

### 数据库设计

#### 新增表：learning_materials
```sql
CREATE TABLE learning_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  weakness_id INT COMMENT '关联的弱点ID（可选）',
  category VARCHAR(50) NOT NULL COMMENT '专项类别',
  weakness_type VARCHAR(50) NOT NULL COMMENT '弱点类型',
  title VARCHAR(200) NOT NULL COMMENT '素材标题',
  content TEXT NOT NULL COMMENT '素材内容（Markdown格式）',
  material_type VARCHAR(50) DEFAULT 'text' COMMENT '素材类型: text, link, example, tip, practice',
  tags JSON COMMENT '标签',
  usage_count INT DEFAULT 0 COMMENT '使用次数',
  created_by VARCHAR(50) DEFAULT 'ai' COMMENT '创建方式: ai, manual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_weakness (weakness_id),
  INDEX idx_category (category),
  INDEX idx_weakness_type (weakness_type),
  FOREIGN KEY (weakness_id) REFERENCES student_weaknesses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习素材';
```

### 用户体验增强
- 在导航菜单中添加"学习素材"入口（使用BookOutlined图标）
- 素材列表支持卡片和列表两种视图
- 素材详情支持Markdown渲染
- 支持素材收藏和快速访问
- 素材使用统计（查看次数、关联练习次数）

### 技术实现
- 前端新增页面：`frontend/src/pages/LearningMaterials/index.tsx`
- 前端新增路由：`/learning-materials` 和 `/learning-materials/:id`
- 前端增强：`pages/Weaknesses/index.tsx` - 添加生成素材功能
- 前端增强：`pages/Practice/index.tsx` - 集成素材选择和使用
- 后端新增路由：`routes/learningMaterials.ts` - 素材CRUD API
- 后端新增API：`POST /api/ai/generate-learning-material` - AI生成素材
- AI服务增强：新增素材生成函数

**非BREAKING**：这是新增功能，不影响现有功能。

## Impact

### 影响规范
- **weakness-management** (修改): 增加学习素材生成和管理功能
- **interview-practice** (修改): 增加素材选择和集成功能

### 影响代码
- **前端**:
  - `App.tsx`: 添加 `/learning-materials` 和 `/learning-materials/:id` 路由
  - `components/Layout.tsx`: 添加学习素材菜单项
  - `pages/LearningMaterials/index.tsx`: 新建学习素材管理页面
  - `pages/Weaknesses/index.tsx`: 添加生成素材按钮和素材列表
  - `pages/Practice/index.tsx`: 添加素材选择和显示功能
  - `utils/api.ts`: 添加学习素材相关API方法
- **后端**:
  - `routes/learningMaterials.ts`: 新建学习素材路由
  - `routes/ai.ts`: 新增 `POST /api/ai/generate-learning-material` 路由
  - `ai/materialGenerator.ts`: 新建AI素材生成服务
  - 数据库迁移：创建 `learning_materials` 表

### 实现状态
- 📋 **待实现**: 所有功能待开发

## Benefits

1. **系统化提升**：为每个弱点提供专门的学习素材，帮助学生系统化地改善问题
2. **AI驱动**：自动生成个性化素材，提高效率，减少手动创建的工作量
3. **练习结合**：素材与练习紧密结合，让练习更有针对性，反馈更有效
4. **知识积累**：素材库可以持续积累，形成知识库，供后续使用
5. **用户体验**：统一的素材管理界面，方便查找和使用
6. **数据驱动**：通过使用统计了解哪些素材最有效，优化素材质量
