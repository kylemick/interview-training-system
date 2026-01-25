# Change: 添加弱點提升學習素材功能

## Why

当前係統中，弱點管理功能已经完整实现，用户可以查看弱點、生成針對性題目、創建訓練計劃。但是，在提升弱點的過程中，學生还需要：

1. **學習素材支持**：針對不同弱點類型，需要相關的學習資料、示例、技巧等素材來帮助理解和提升
2. **素材与練習結合**：練習時应该能够參考相關素材，让練習更有針對性
3. **AI生成素材**：利用AI能力自動为每个弱點生成个性化的學習素材，提高效率
4. **素材管理**：需要一个專门的页面來管理和查看所有學習素材

## What Changes

### 核心功能

#### 1. 學習素材管理页面
- 創建独立的學習素材管理页面 (`/learning-materials`)，提供完整的素材CRUD操作
- 素材列表页面：支持按弱點、類別、類型筛選、搜索、分页
- 素材详情页面：展示完整信息（內容、關聯弱點、使用統計、創建時間等）
- 素材分類：按弱點類型分類（vocabulary, grammar, logic, knowledge_gap, confidence, expression）
- 素材類型：文本、链接、示例、技巧、練習建議等

#### 2. 弱點页面增强
- 在弱點详情页面添加"生成學習素材"按钮
- 使用AI自動生成針對该弱點的學習素材
- 显示该弱點關聯的學習素材列表
- 快速跳转到素材详情或编輯

#### 3. AI生成學習素材
- 後端新增API：`POST /api/ai/generate-learning-material` - 基于弱點生成學習素材
- AI服務增强：分析弱點類型、嚴重程度、相關話題，生成个性化的學習素材
- 素材內容包括：
  - 知識點讲解
  - 常见错误示例
  - 改進技巧
  - 練習建議
  - 相關資源链接（可選）

#### 4. 練習页面集成
- 在練習页面支持選擇弱點和關聯素材
- 練習時显示相關素材提示
- 練習反馈中結合弱點和素材给出改進建議
- 支持"弱點專項練習"模式：基于選定弱點和素材生成題目

### 數據庫设計

#### 新增表：learning_materials
```sql
CREATE TABLE learning_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  weakness_id INT COMMENT '關聯的弱點ID（可選）',
  category VARCHAR(50) NOT NULL COMMENT '專項類別',
  weakness_type VARCHAR(50) NOT NULL COMMENT '弱點類型',
  title VARCHAR(200) NOT NULL COMMENT '素材標題',
  content TEXT NOT NULL COMMENT '素材內容（Markdown格式）',
  material_type VARCHAR(50) DEFAULT 'text' COMMENT '素材類型: text, link, example, tip, practice',
  tags JSON COMMENT '標籤',
  usage_count INT DEFAULT 0 COMMENT '使用次數',
  created_by VARCHAR(50) DEFAULT 'ai' COMMENT '創建方式: ai, manual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_weakness (weakness_id),
  INDEX idx_category (category),
  INDEX idx_weakness_type (weakness_type),
  FOREIGN KEY (weakness_id) REFERENCES student_weaknesses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='學習素材';
```

### 用户体验增强
- 在導航菜单中添加"學習素材"入口（使用BookOutlined图標）
- 素材列表支持卡片和列表两種视图
- 素材详情支持Markdown渲染
- 支持素材收藏和快速访問
- 素材使用統計（查看次數、關聯練習次數）

### 技術实现
- 前端新增页面：`frontend/src/pages/LearningMaterials/index.tsx`
- 前端新增路由：`/learning-materials` 和 `/learning-materials/:id`
- 前端增强：`pages/Weaknesses/index.tsx` - 添加生成素材功能
- 前端增强：`pages/Practice/index.tsx` - 集成素材選擇和使用
- 後端新增路由：`routes/learningMaterials.ts` - 素材CRUD API
- 後端新增API：`POST /api/ai/generate-learning-material` - AI生成素材
- AI服務增强：新增素材生成函數

**非BREAKING**：这是新增功能，不影响现有功能。

## Impact

### 影响規范
- **weakness-management** (修改): 增加學習素材生成和管理功能
- **interview-practice** (修改): 增加素材選擇和集成功能

### 影响代碼
- **前端**:
  - `App.tsx`: 添加 `/learning-materials` 和 `/learning-materials/:id` 路由
  - `components/Layout.tsx`: 添加學習素材菜单項
  - `pages/LearningMaterials/index.tsx`: 新建學習素材管理页面
  - `pages/Weaknesses/index.tsx`: 添加生成素材按钮和素材列表
  - `pages/Practice/index.tsx`: 添加素材選擇和显示功能
  - `utils/api.ts`: 添加學習素材相關API方法
- **後端**:
  - `routes/learningMaterials.ts`: 新建學習素材路由
  - `routes/ai.ts`: 新增 `POST /api/ai/generate-learning-material` 路由
  - `ai/materialGenerator.ts`: 新建AI素材生成服務
  - 數據庫迁移：創建 `learning_materials` 表

### 实现狀態
- 📋 **待实现**: 所有功能待開發

## Benefits

1. **係統化提升**：为每个弱點提供專门的學習素材，帮助學生係統化地改善問題
2. **AI驱動**：自動生成个性化素材，提高效率，减少手動創建的工作量
3. **練習結合**：素材与練習紧密結合，让練習更有針對性，反馈更有效
4. **知識积累**：素材庫可以持续积累，形成知識庫，供後续使用
5. **用户体验**：統一的素材管理界面，方便查找和使用
6. **數據驱動**：通過使用統計了解哪些素材最有效，優化素材质量
