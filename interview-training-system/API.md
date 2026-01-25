# API 文档

## 概述

升中面试训练系统提供RESTful API，用于管理训练计划、练习会话、题库、学校档案等功能。所有API均以JSON格式返回数据。

**基础URL**: `http://localhost:3001/api`

**响应格式**:
```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "错误描述"
  }
}
```

---

## 1. 学校档案 (Schools)

### 1.1 获取所有学校
**GET** `/schools`

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "SPCC",
      "name": "St. Paul's Co-educational College",
      "name_zh": "圣保罗男女中学",
      "focus_areas": ["english-oral", "logic-thinking", "science-knowledge"],
      "interview_style": "academic-rigorous",
      "notes": "..."
    }
  ]
}
```

### 1.2 获取单个学校
**GET** `/schools/:code`

### 1.3 创建学校
**POST** `/schools`

**请求体**:
```json
{
  "code": "SPCC",
  "name": "St. Paul's Co-educational College",
  "name_zh": "圣保罗男女中学",
  "focus_areas": ["english-oral", "logic-thinking"],
  "interview_style": "academic-rigorous",
  "notes": "备注"
}
```

### 1.4 更新学校
**PUT** `/schools/:code`

### 1.5 删除学校
**DELETE** `/schools/:code`

---

## 2. 题库管理 (Questions)

### 2.1 获取题目列表
**GET** `/questions?category=&difficulty=&source=`

**查询参数**:
- `category`: 专项类别（可选）
- `difficulty`: 难度（可选）
- `source`: 来源（可选）

### 2.2 获取单个题目
**GET** `/questions/:id`

### 2.3 创建题目
**POST** `/questions`

**请求体**:
```json
{
  "category": "english-oral",
  "question_text": "Tell me about your favorite book.",
  "difficulty": "medium",
  "reference_answer": "参考答案要点",
  "tags": ["reading", "hobbies"],
  "school_code": "SPCC"
}
```

### 2.4 更新题目
**PUT** `/questions/:id`

### 2.5 删除题目
**DELETE** `/questions/:id`

### 2.6 获取题库统计
**GET** `/questions/stats/summary`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "total": 294,
    "by_category": [
      { "category": "english-oral", "count": 50 },
      { "category": "chinese-oral", "count": 45 }
    ],
    "by_difficulty": [
      { "difficulty": "easy", "count": 100 },
      { "difficulty": "medium", "count": 150 },
      { "difficulty": "hard", "count": 44 }
    ],
    "by_source": [
      { "source": "seed", "count": 200 },
      { "source": "ai_generated", "count": 94 }
    ]
  }
}
```

---

## 3. 训练计划 (Plans)

### 3.1 获取训练计划列表
**GET** `/plans`

### 3.2 获取单个训练计划
**GET** `/plans/:id`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": 1,
      "student_name": "张三",
      "target_school": "SPCC",
      "start_date": "2026-01-20",
      "end_date": "2026-03-15",
      "total_days": 54,
      "daily_duration": 30,
      "category_allocation": {
        "english-oral": 30,
        "chinese-oral": 20,
        "logic-thinking": 25,
        "current-affairs": 10,
        "science-knowledge": 10,
        "personal-growth": 5
      },
      "ai_suggestions": "...",
      "status": "active",
      "created_at": "2026-01-20T10:00:00Z"
    },
    "tasks": [...]
  }
}
```

### 3.3 创建训练计划（AI生成）
**POST** `/plans`

**请求体**:
```json
{
  "student_name": "张三",
  "target_school": "SPCC",
  "start_date": "2026-01-20",
  "end_date": "2026-03-15",
  "daily_duration": 30
}
```

### 3.4 更新计划状态
**PATCH** `/plans/:id/status`

**请求体**:
```json
{
  "status": "completed"
}
```

### 3.5 删除训练计划
**DELETE** `/plans/:id`

---

## 4. 练习会话 (Sessions)

### 4.1 创建练习会话
**POST** `/sessions`

**请求体**:
```json
{
  "plan_id": 1,
  "task_id": 10,
  "category": "english-oral",
  "mode": "practice",
  "question_ids": [1, 2, 3, 4, 5]
}
```

### 4.2 获取会话详情
**GET** `/sessions/:id`

### 4.3 提交答案
**POST** `/sessions/:id/submit`

**请求体**:
```json
{
  "answers": [
    {
      "question_id": 1,
      "answer": "学生的回答内容"
    }
  ]
}
```

### 4.4 完成会话
**POST** `/sessions/:id/complete`

### 4.5 获取会话列表
**GET** `/sessions?category=&status=&date_from=&date_to=`

---

## 5. AI 反馈 (Feedback)

### 5.1 生成反馈
**POST** `/feedback/generate`

**请求体**:
```json
{
  "session_id": 1,
  "target_school": "SPCC"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "overall_score": 75,
    "language_quality": {
      "score": 80,
      "comments": "..."
    },
    "content_depth": {
      "score": 70,
      "comments": "..."
    },
    "strengths": ["表达流畅", "逻辑清晰"],
    "weaknesses": ["词汇量需提升", "缺乏具体例子"],
    "suggestions": ["建议多阅读英文原著"],
    "school_specific_advice": "针对SPCC的建议..."
  }
}
```

### 5.2 获取会话反馈
**GET** `/feedback/session/:session_id`

### 5.3 获取反馈列表
**GET** `/feedback?student_id=&date_from=&date_to=`

---

## 6. 进度追踪 (Progress)

### 6.1 获取进度统计
**GET** `/progress/stats?time_range=week&student_id=`

**时间范围**: `day`, `week`, `month`, `all`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "total_sessions": 25,
    "total_questions": 125,
    "average_score": 72,
    "by_category": {
      "english-oral": { "count": 30, "avg_score": 75 },
      "chinese-oral": { "count": 25, "avg_score": 68 }
    },
    "by_date": [
      { "date": "2026-01-20", "sessions": 2, "avg_score": 70 }
    ],
    "weaknesses": ["chinese-oral", "logic-thinking"]
  }
}
```

---

## 7. AI 服务 (AI)

### 7.1 AI 生成学校档案
**POST** `/ai/generate-school`

**请求体**:
```json
{
  "schoolName": "圣保罗男女中学"
}
```

### 7.2 AI 生成题目
**POST** `/ai/generate-questions`

**请求体**:
```json
{
  "category": "english-oral",
  "difficulty": "medium",
  "count": 5,
  "school_code": "SPCC",
  "topic": "环境保护",
  "save": true
}
```

### 7.3 AI 分析面试回忆
**POST** `/ai/extract-interview-memory`

**请求体**:
```json
{
  "text": "今天去了SPCC面试，遇到了以下问题...",
  "category": "english-oral",
  "school_code": "SPCC"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "question_text": "Tell me about your favorite book.",
        "category": "english-oral",
        "difficulty": "medium",
        "reference_answer": "参考答案要点",
        "tags": ["reading", "hobbies"],
        "notes": "学生回答了Harry Potter..."
      }
    ],
    "summary": "本次面试主要考察英文表达能力..."
  }
}
```

### 7.4 保存面试回忆题目到题库
**POST** `/ai/save-interview-questions`

**请求体**:
```json
{
  "questions": [...],
  "source_text": "原始面试回忆文本"
}
```

### 7.5 测试 API 连接
**POST** `/ai/test-connection`

**请求体**:
```json
{
  "api_key": "sk-..."
}
```

---

## 8. 数据管理 (Data)

### 8.1 导入种子数据

#### 8.1.1 导入学校种子数据
**POST** `/data/seed-schools`

#### 8.1.2 导入题库种子数据
**POST** `/data/seed-questions`

#### 8.1.3 导入所有种子数据
**POST** `/data/seed-all`

### 8.2 获取数据库统计
**GET** `/data/stats`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "schools": 5,
    "questions": 294,
    "plans": 3,
    "sessions": 25,
    "questionsBySource": [...],
    "seedSchools": 5
  }
}
```

### 8.3 导出所有数据
**GET** `/data/export`

**响应**: JSON文件下载

### 8.4 导入备份数据
**POST** `/data/import`

**请求体**:
```json
{
  "data": {
    "exported_at": "2026-01-25T10:00:00Z",
    "version": "1.0.0",
    "data": {
      "training_plans": [...],
      "daily_tasks": [...],
      "sessions": [...],
      "qa_records": [...],
      "feedback": [...],
      "questions": [...],
      "school_profiles": [...]
    }
  },
  "options": {
    "merge": true,
    "overwrite": false
  }
}
```

**导入选项**:
- `merge: true` - 合并模式（保留现有数据，跳过重复）
- `overwrite: true` - 覆盖模式（清空现有数据后导入）

### 8.5 清空训练数据
**DELETE** `/data/clear`

---

## 9. 系统设置 (Settings)

### 9.1 获取设置
**GET** `/settings`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "student_name": "张三",
    "target_school": "SPCC",
    "deepseek_api_key": "sk-1234567...",
    "daily_duration": 30,
    "notification_enabled": true,
    "created_at": "2026-01-20T10:00:00Z",
    "updated_at": "2026-01-25T10:00:00Z"
  }
}
```

### 9.2 保存设置
**POST** `/settings`

**请求体**:
```json
{
  "student_name": "张三",
  "target_school": "SPCC",
  "deepseek_api_key": "sk-...",
  "daily_duration": 30,
  "notification_enabled": true
}
```

### 9.3 重置设置
**DELETE** `/settings`

---

## 10. 健康检查

### 10.1 健康检查
**GET** `/health`

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-25T10:00:00Z"
}
```

---

## 专项类别 (Categories)

系统支持七大专项类别：

| 代码 | 中文名称 | 英文名称 |
|------|---------|---------|
| `english-oral` | 英文口语 | English Oral |
| `chinese-oral` | 中文表达 | Chinese Expression |
| `logic-thinking` | 逻辑思维 | Logical Thinking |
| `current-affairs` | 时事常识 | Current Affairs |
| `science-knowledge` | 科学常识 | Science Knowledge |
| `personal-growth` | 个人成长 | Personal Growth |
| `group-discussion` | 小组讨论 | Group Discussion |

## 难度等级 (Difficulty)

| 代码 | 中文名称 |
|------|---------|
| `easy` | 简单 |
| `medium` | 中等 |
| `hard` | 困难 |

## 学校代码 (School Codes)

| 代码 | 学校名称 |
|------|---------|
| `SPCC` | 圣保罗男女中学 (St. Paul's Co-educational College) |
| `QC` | 皇仁书院 (Queen's College) |
| `LSC` | 喇沙书院 (La Salle College) |
| `DBS` | 拔萃男书院 (Diocesan Boys' School) |
| `DGS` | 拔萃女书院 (Diocesan Girls' School) |

## 错误代码

| HTTP状态码 | 说明 |
|-----------|------|
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 404 | 资源不存在 |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |

## 使用示例

### 创建训练计划并开始练习

```bash
# 1. 创建训练计划
curl -X POST http://localhost:3001/api/plans \
  -H "Content-Type: application/json" \
  -d '{
    "student_name": "张三",
    "target_school": "SPCC",
    "start_date": "2026-01-20",
    "end_date": "2026-03-15",
    "daily_duration": 30
  }'

# 2. 创建练习会话
curl -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": 1,
    "category": "english-oral",
    "mode": "practice",
    "question_ids": [1, 2, 3, 4, 5]
  }'

# 3. 提交答案
curl -X POST http://localhost:3001/api/sessions/1/submit \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {"question_id": 1, "answer": "My favorite book is..."}
    ]
  }'

# 4. 完成会话
curl -X POST http://localhost:3001/api/sessions/1/complete

# 5. 生成反馈
curl -X POST http://localhost:3001/api/feedback/generate \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "target_school": "SPCC"
  }'
```

## 注意事项

1. **API Key**: 所有AI相关功能需要配置DeepSeek API Key
2. **本地运行**: 系统设计为本地运行，不支持远程访问
3. **数据备份**: 建议定期导出数据备份
4. **网络连接**: AI功能需要网络连接
5. **并发限制**: 本地单用户使用，无并发限制

## 更新日志

### v1.0.0 (2026-01-25)
- 初始版本发布
- 完整的MVP功能
- 七大专项训练
- AI智能生成和反馈
- 数据导入导出
- 面试回忆分析
