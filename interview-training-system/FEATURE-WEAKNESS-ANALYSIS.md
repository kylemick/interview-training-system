# 新功能：學生弱點分析与針對性題目生成

## 功能概述

係統现在不仅能從面試回憶中提取問題，还能智能分析學生的表现弱點，并根據这些弱點生成針對性的練習題目。

## 核心功能

### 1. 智能弱點識別

**AI分析維度**：
- **vocabulary** (詞汇量) - 詞汇贫乏、用詞不当
- **grammar** (語法) - 語法错误、句式简单
- **logic** (邏輯) - 邏輯混乱、思路不清
- **knowledge_gap** (知識盲区) - 知識储備不足
- **confidence** (信心) - 表達犹豫、不自信
- **expression** (表達能力) - 表達不清、組织能力弱

**嚴重程度評估**：
- **low** (低) - 轻微問題，稍加注意即可
- **medium** (中) - 需要針對性練習
- **high** (高) - 需要重點加强

### 2. 數據結构

#### 新增表：student_weaknesses

```sql
CREATE TABLE student_weaknesses (
  id INT PRIMARY KEY,
  student_name VARCHAR(100),        -- 學生姓名（可選）
  category VARCHAR(50),              -- 專項類別
  weakness_type VARCHAR(50),         -- 弱點類型
  description TEXT,                  -- 弱點描述
  example_text TEXT,                 -- 示例文本
  severity VARCHAR(20),              -- 嚴重程度
  improvement_suggestions TEXT,      -- 改進建議
  related_topics JSON,               -- 相關話題
  source_text TEXT,                  -- 來源文本
  identified_by VARCHAR(50),         -- 識別方式 (ai/manual)
  status VARCHAR(20),                -- 狀態 (active/improved/resolved)
  practice_count INT,                -- 已練習次數
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## API 接口

### 1. 面試回憶分析（增强）

**端點**: `POST /api/ai/extract-interview-memory`

**新的响应格式**:
```json
{
  "success": true,
  "message": "成功提取 3 个問題",
  "data": {
    "questions": [...],
    "weaknesses": [
      {
        "category": "english-oral",
        "weakness_type": "vocabulary",
        "description": "詞汇量不足，表達单一",
        "example_text": "I think... I think... it's good...",
        "severity": "medium",
        "improvement_suggestions": "建議多阅读英文原著，扩展詞汇量...",
        "related_topics": ["reading", "vocabulary"]
      }
    ],
    "summary": "整体分析..."
  }
}
```

### 2. 保存弱點分析

**端點**: `POST /api/ai/save-weaknesses`

**请求体**:
```json
{
  "weaknesses": [...],
  "student_name": "张三",
  "source_text": "原始面試回憶文本"
}
```

### 3. 获取弱點列表

**端點**: `GET /api/weaknesses`

**查询參數**:
- `student_name` - 學生姓名
- `category` - 專項類別
- `status` - 狀態
- `severity` - 嚴重程度

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "category": "english-oral",
      "weakness_type": "vocabulary",
      "description": "詞汇量不足",
      "severity": "medium",
      "status": "active",
      "practice_count": 0,
      "created_at": "..."
    }
  ]
}
```

### 4. 根據弱點生成針對性題目 🆕

**端點**: `POST /api/ai/generate-questions-from-weaknesses`

**请求体**:
```json
{
  "weakness_ids": [1, 2, 3],  // 弱點ID列表
  "count": 5                   // 生成題目數量
}
```

或

```json
{
  "category": "english-oral",  // 获取该類別所有活跃弱點
  "count": 5
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "成功生成 5 道針對性題目",
  "data": {
    "questions": [
      {
        "id": 101,
        "question_text": "请用三種不同的方式描述你最喜欢的季节",
        "category": "english-oral",
        "difficulty": "medium",
        "reference_answer": "...",
        "tags": ["vocabulary", "expression"],
        "target_weakness": "vocabulary",
        "training_focus": "訓練使用多樣化的詞汇和表達方式"
      }
    ],
    "targeted_weaknesses": [
      {
        "id": 1,
        "description": "詞汇量不足",
        "weakness_type": "vocabulary"
      }
    ]
  }
}
```

### 5. 弱點統計

**端點**: `GET /api/weaknesses/stats/summary`

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

### 6. 更新弱點狀態

**端點**: `PATCH /api/weaknesses/:id/status`

**请求体**:
```json
{
  "status": "improved"  // active/improved/resolved
}
```

## 使用流程

### 流程 1: 面試回憶分析并保存

```bash
# 1. 提交面試回憶進行AI分析
curl -X POST http://localhost:3001/api/ai/extract-interview-memory \
  -H "Content-Type: application/json" \
  -d '{
    "text": "今天去了SPCC面試。面試官問我：Tell me about your favorite book. 我說：I like... um... Harry Potter. It is... good. 然後問：What do you think about climate change? 我說：Climate change is... bad. Very bad."
  }'

# 2. AI會返回：
# - 提取的問題列表
# - 識別的弱點（如：詞汇单一、表達犹豫）
# - 整体分析

# 3. 前端自動保存問題和弱點
# - 問題保存到 questions 表
# - 弱點保存到 student_weaknesses 表
```

### 流程 2: 根據弱點生成針對性題目

```bash
# 1. 查看學生的弱點
curl http://localhost:3001/api/weaknesses?status=active

# 2. 根據弱點ID生成題目
curl -X POST http://localhost:3001/api/ai/generate-questions-from-weaknesses \
  -H "Content-Type: application/json" \
  -d '{
    "weakness_ids": [1, 2],
    "count": 5
  }'

# 3. AI會生成針對这些弱點的練習題
# - 題目針對性强
# - 難度适中
# - 包含訓練重點說明
# - 自動保存到題庫
# - 更新弱點的practice_count
```

### 流程 3: 追踪改進進度

```bash
# 1. 查看弱點統計
curl http://localhost:3001/api/weaknesses/stats/summary

# 2. 完成針對性練習後，標記弱點狀態
curl -X PATCH http://localhost:3001/api/weaknesses/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "improved"}'

# 3. 持续追踪
# - active: 需要練習
# - improved: 有改善
# - resolved: 已解决
```

## 前端界面增强

### 面試回憶页面

**新增显示**：
- ⚠️ 弱點分析卡片
  - 嚴重程度標籤（高/中/低）
  - 弱點描述
  - 示例文本
  - 改進建議
  - 相關話題

**保存邏輯**：
- 點击"保存到題庫"時，自動保存：
  1. 提取的問題 → `questions` 表
  2. 識別的弱點 → `student_weaknesses` 表

### 題庫管理页面（建議增强）

**新增功能**：
- "根據弱點生成題目"按钮
- 選擇弱點類型
- 生成針對性題目
- 显示目標弱點

## 數據流程图

```
面試回憶文本
    ↓
AI 分析
    ↓
提取問題 + 識別弱點
    ↓
保存到數據庫
    ├─→ questions (題目)
    └─→ student_weaknesses (弱點)
    ↓
根據弱點生成題目
    ↓
AI 生成針對性題目
    ↓
保存到 questions (標記为針對性)
    ↓
學生練習
    ↓
更新 practice_count
    ↓
標記弱點狀態改善
```

## 示例场景

### 场景 1: 詞汇量不足

**分析結果**:
```json
{
  "weakness_type": "vocabulary",
  "description": "詞汇量不足，经常重复使用简单詞汇",
  "example_text": "I think... I think... it's good... very good...",
  "severity": "medium",
  "improvement_suggestions": "建議每天學習10个新詞汇，尝試在回答中使用同义詞"
}
```

**生成的針對性題目**:
1. "请用三種不同的方式描述你最喜欢的季节"
2. "用丰富的詞汇描述一次難忘的旅行经历"
3. "除了說'good'，你还能用哪些詞來表達'好'的意思？"

### 场景 2: 邏輯不清

**分析結果**:
```json
{
  "weakness_type": "logic",
  "description": "回答缺乏邏輯性，觀點跳跃",
  "severity": "high",
  "improvement_suggestions": "建議使用'Firstly... Secondly... Finally...'等连接詞"
}
```

**生成的針對性題目**:
1. "请按邏輯顺序說明你如何準備一场考試"
2. "用三个論點支持你的觀點：为什么环保很重要"
3. "解释因果關係：科技發展如何影响教育"

## 技術实现要點

### AI提示詞優化

```typescript
const prompt = `
你是一个面試弱點分析專家。请分析學生的表现，識別具体的弱點。

分析維度：
1. 詞汇量 - 是否重复使用简单詞汇
2. 語法 - 是否有明显語法错误
3. 邏輯 - 是否条理清晰
4. 知識 - 是否有知識盲区
5. 信心 - 是否表達犹豫
6. 表達 - 是否能清晰傳達意思

對每个識別的弱點：
- 提供具体描述
- 引用原文示例
- 評估嚴重程度
- 给出改進建議
`;
```

### 數據庫優化

**索引**:
```sql
CREATE INDEX idx_student_category ON student_weaknesses(student_name, category);
CREATE INDEX idx_status_severity ON student_weaknesses(status, severity);
CREATE INDEX idx_created ON student_weaknesses(created_at);
```

**查询優化**:
```sql
-- 获取學生最嚴重的3个弱點
SELECT * FROM student_weaknesses 
WHERE student_name = '张三' AND status = 'active'
ORDER BY severity DESC, created_at DESC
LIMIT 3;
```

## 未來增强方向

1. **弱點趋勢分析**
   - 追踪弱點改善曲线
   - 预测需要加强的領域

2. **智能練習推荐**
   - 根據弱點自動推荐練習題
   - 調整練習難度

3. **多維度評估**
   - 結合多次面試回憶
   - 生成综合弱點报告

4. **个性化學習路径**
   - 基于弱點生成學習計劃
   - 優先级排序

## 總結

这个功能让係統從"題目練習工具"升级为"智能訓練助手"，能够：

✅ 自動識別學生弱點
✅ 保存弱點历史記錄
✅ 生成針對性練習題目
✅ 追踪改進進度
✅ 提供个性化建議

让學生的練習更有針對性，提高備考效率！
