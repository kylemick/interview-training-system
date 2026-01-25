# 新功能：学生弱点分析与针对性题目生成

## 功能概述

系统现在不仅能从面试回忆中提取问题，还能智能分析学生的表现弱点，并根据这些弱点生成针对性的练习题目。

## 核心功能

### 1. 智能弱点识别

**AI分析维度**：
- **vocabulary** (词汇量) - 词汇贫乏、用词不当
- **grammar** (语法) - 语法错误、句式简单
- **logic** (逻辑) - 逻辑混乱、思路不清
- **knowledge_gap** (知识盲区) - 知识储备不足
- **confidence** (信心) - 表达犹豫、不自信
- **expression** (表达能力) - 表达不清、组织能力弱

**严重程度评估**：
- **low** (低) - 轻微问题，稍加注意即可
- **medium** (中) - 需要针对性练习
- **high** (高) - 需要重点加强

### 2. 数据结构

#### 新增表：student_weaknesses

```sql
CREATE TABLE student_weaknesses (
  id INT PRIMARY KEY,
  student_name VARCHAR(100),        -- 学生姓名（可选）
  category VARCHAR(50),              -- 专项类别
  weakness_type VARCHAR(50),         -- 弱点类型
  description TEXT,                  -- 弱点描述
  example_text TEXT,                 -- 示例文本
  severity VARCHAR(20),              -- 严重程度
  improvement_suggestions TEXT,      -- 改进建议
  related_topics JSON,               -- 相关话题
  source_text TEXT,                  -- 来源文本
  identified_by VARCHAR(50),         -- 识别方式 (ai/manual)
  status VARCHAR(20),                -- 状态 (active/improved/resolved)
  practice_count INT,                -- 已练习次数
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## API 接口

### 1. 面试回忆分析（增强）

**端点**: `POST /api/ai/extract-interview-memory`

**新的响应格式**:
```json
{
  "success": true,
  "message": "成功提取 3 个问题",
  "data": {
    "questions": [...],
    "weaknesses": [
      {
        "category": "english-oral",
        "weakness_type": "vocabulary",
        "description": "词汇量不足，表达单一",
        "example_text": "I think... I think... it's good...",
        "severity": "medium",
        "improvement_suggestions": "建议多阅读英文原著，扩展词汇量...",
        "related_topics": ["reading", "vocabulary"]
      }
    ],
    "summary": "整体分析..."
  }
}
```

### 2. 保存弱点分析

**端点**: `POST /api/ai/save-weaknesses`

**请求体**:
```json
{
  "weaknesses": [...],
  "student_name": "张三",
  "source_text": "原始面试回忆文本"
}
```

### 3. 获取弱点列表

**端点**: `GET /api/weaknesses`

**查询参数**:
- `student_name` - 学生姓名
- `category` - 专项类别
- `status` - 状态
- `severity` - 严重程度

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "category": "english-oral",
      "weakness_type": "vocabulary",
      "description": "词汇量不足",
      "severity": "medium",
      "status": "active",
      "practice_count": 0,
      "created_at": "..."
    }
  ]
}
```

### 4. 根据弱点生成针对性题目 🆕

**端点**: `POST /api/ai/generate-questions-from-weaknesses`

**请求体**:
```json
{
  "weakness_ids": [1, 2, 3],  // 弱点ID列表
  "count": 5                   // 生成题目数量
}
```

或

```json
{
  "category": "english-oral",  // 获取该类别所有活跃弱点
  "count": 5
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "成功生成 5 道针对性题目",
  "data": {
    "questions": [
      {
        "id": 101,
        "question_text": "请用三种不同的方式描述你最喜欢的季节",
        "category": "english-oral",
        "difficulty": "medium",
        "reference_answer": "...",
        "tags": ["vocabulary", "expression"],
        "target_weakness": "vocabulary",
        "training_focus": "训练使用多样化的词汇和表达方式"
      }
    ],
    "targeted_weaknesses": [
      {
        "id": 1,
        "description": "词汇量不足",
        "weakness_type": "vocabulary"
      }
    ]
  }
}
```

### 5. 弱点统计

**端点**: `GET /api/weaknesses/stats/summary`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "total": 15,
    "by_category": [
      {"category": "english-oral", "count": 5},
      {"category": "logic-thinking", "count": 3}
    ],
    "by_type": [
      {"weakness_type": "vocabulary", "count": 4},
      {"weakness_type": "logic", "count": 3}
    ],
    "by_severity": [
      {"severity": "high", "count": 2},
      {"severity": "medium", "count": 8}
    ],
    "by_status": [
      {"status": "active", "count": 12},
      {"status": "improved", "count": 3}
    ]
  }
}
```

### 6. 更新弱点状态

**端点**: `PATCH /api/weaknesses/:id/status`

**请求体**:
```json
{
  "status": "improved"  // active/improved/resolved
}
```

## 使用流程

### 流程 1: 面试回忆分析并保存

```bash
# 1. 提交面试回忆进行AI分析
curl -X POST http://localhost:3001/api/ai/extract-interview-memory \
  -H "Content-Type: application/json" \
  -d '{
    "text": "今天去了SPCC面试。面试官问我：Tell me about your favorite book. 我说：I like... um... Harry Potter. It is... good. 然后问：What do you think about climate change? 我说：Climate change is... bad. Very bad."
  }'

# 2. AI会返回：
# - 提取的问题列表
# - 识别的弱点（如：词汇单一、表达犹豫）
# - 整体分析

# 3. 前端自动保存问题和弱点
# - 问题保存到 questions 表
# - 弱点保存到 student_weaknesses 表
```

### 流程 2: 根据弱点生成针对性题目

```bash
# 1. 查看学生的弱点
curl http://localhost:3001/api/weaknesses?status=active

# 2. 根据弱点ID生成题目
curl -X POST http://localhost:3001/api/ai/generate-questions-from-weaknesses \
  -H "Content-Type: application/json" \
  -d '{
    "weakness_ids": [1, 2],
    "count": 5
  }'

# 3. AI会生成针对这些弱点的练习题
# - 题目针对性强
# - 难度适中
# - 包含训练重点说明
# - 自动保存到题库
# - 更新弱点的practice_count
```

### 流程 3: 追踪改进进度

```bash
# 1. 查看弱点统计
curl http://localhost:3001/api/weaknesses/stats/summary

# 2. 完成针对性练习后，标记弱点状态
curl -X PATCH http://localhost:3001/api/weaknesses/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "improved"}'

# 3. 持续追踪
# - active: 需要练习
# - improved: 有改善
# - resolved: 已解决
```

## 前端界面增强

### 面试回忆页面

**新增显示**：
- ⚠️ 弱点分析卡片
  - 严重程度标签（高/中/低）
  - 弱点描述
  - 示例文本
  - 改进建议
  - 相关话题

**保存逻辑**：
- 点击"保存到题库"时，自动保存：
  1. 提取的问题 → `questions` 表
  2. 识别的弱点 → `student_weaknesses` 表

### 题库管理页面（建议增强）

**新增功能**：
- "根据弱点生成题目"按钮
- 选择弱点类型
- 生成针对性题目
- 显示目标弱点

## 数据流程图

```
面试回忆文本
    ↓
AI 分析
    ↓
提取问题 + 识别弱点
    ↓
保存到数据库
    ├─→ questions (题目)
    └─→ student_weaknesses (弱点)
    ↓
根据弱点生成题目
    ↓
AI 生成针对性题目
    ↓
保存到 questions (标记为针对性)
    ↓
学生练习
    ↓
更新 practice_count
    ↓
标记弱点状态改善
```

## 示例场景

### 场景 1: 词汇量不足

**分析结果**:
```json
{
  "weakness_type": "vocabulary",
  "description": "词汇量不足，经常重复使用简单词汇",
  "example_text": "I think... I think... it's good... very good...",
  "severity": "medium",
  "improvement_suggestions": "建议每天学习10个新词汇，尝试在回答中使用同义词"
}
```

**生成的针对性题目**:
1. "请用三种不同的方式描述你最喜欢的季节"
2. "用丰富的词汇描述一次难忘的旅行经历"
3. "除了说'good'，你还能用哪些词来表达'好'的意思？"

### 场景 2: 逻辑不清

**分析结果**:
```json
{
  "weakness_type": "logic",
  "description": "回答缺乏逻辑性，观点跳跃",
  "severity": "high",
  "improvement_suggestions": "建议使用'Firstly... Secondly... Finally...'等连接词"
}
```

**生成的针对性题目**:
1. "请按逻辑顺序说明你如何准备一场考试"
2. "用三个论点支持你的观点：为什么环保很重要"
3. "解释因果关系：科技发展如何影响教育"

## 技术实现要点

### AI提示词优化

```typescript
const prompt = `
你是一个面试弱点分析专家。请分析学生的表现，识别具体的弱点。

分析维度：
1. 词汇量 - 是否重复使用简单词汇
2. 语法 - 是否有明显语法错误
3. 逻辑 - 是否条理清晰
4. 知识 - 是否有知识盲区
5. 信心 - 是否表达犹豫
6. 表达 - 是否能清晰传达意思

对每个识别的弱点：
- 提供具体描述
- 引用原文示例
- 评估严重程度
- 给出改进建议
`;
```

### 数据库优化

**索引**:
```sql
CREATE INDEX idx_student_category ON student_weaknesses(student_name, category);
CREATE INDEX idx_status_severity ON student_weaknesses(status, severity);
CREATE INDEX idx_created ON student_weaknesses(created_at);
```

**查询优化**:
```sql
-- 获取学生最严重的3个弱点
SELECT * FROM student_weaknesses 
WHERE student_name = '张三' AND status = 'active'
ORDER BY severity DESC, created_at DESC
LIMIT 3;
```

## 未来增强方向

1. **弱点趋势分析**
   - 追踪弱点改善曲线
   - 预测需要加强的领域

2. **智能练习推荐**
   - 根据弱点自动推荐练习题
   - 调整练习难度

3. **多维度评估**
   - 结合多次面试回忆
   - 生成综合弱点报告

4. **个性化学习路径**
   - 基于弱点生成学习计划
   - 优先级排序

## 总结

这个功能让系统从"题目练习工具"升级为"智能训练助手"，能够：

✅ 自动识别学生弱点
✅ 保存弱点历史记录
✅ 生成针对性练习题目
✅ 追踪改进进度
✅ 提供个性化建议

让学生的练习更有针对性，提高备考效率！
