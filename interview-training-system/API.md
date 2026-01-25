# API 文檔

## 概述

升中面試訓練係統提供RESTful API，用于管理訓練計劃、練習會話、題庫、學校檔案等功能。所有API均以JSON格式返回數據。

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

## 1. 學校檔案 (Schools)

### 1.1 获取所有學校
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
      "name_zh": "聖保羅男女中學",
      "focus_areas": ["english-oral", "logic-thinking", "science-knowledge"],
      "interview_style": "academic-rigorous",
      "notes": "..."
    }
  ]
}
```

### 1.2 获取单个學校
**GET** `/schools/:code`

### 1.3 創建學校
**POST** `/schools`

**请求体**:
```json
{
  "code": "SPCC",
  "name": "St. Paul's Co-educational College",
  "name_zh": "聖保羅男女中學",
  "focus_areas": ["english-oral", "logic-thinking"],
  "interview_style": "academic-rigorous",
  "notes": "備注"
}
```

### 1.4 更新學校
**PUT** `/schools/:code`

### 1.5 删除學校
**DELETE** `/schools/:code`

---

## 2. 題庫管理 (Questions)

### 2.1 获取題目列表
**GET** `/questions?category=&difficulty=&source=`

**查询參數**:
- `category`: 專項類別（可選）
- `difficulty`: 難度（可選）
- `source`: 來源（可選）

### 2.2 获取单个題目
**GET** `/questions/:id`

### 2.3 創建題目
**POST** `/questions`

**请求体**:
```json
{
  "category": "english-oral",
  "question_text": "Tell me about your favorite book.",
  "difficulty": "medium",
  "reference_answer": "參考答案要點",
  "tags": ["reading", "hobbies"],
  "school_code": "SPCC"
}
```

### 2.4 更新題目
**PUT** `/questions/:id`

### 2.5 删除題目
**DELETE** `/questions/:id`

### 2.6 获取題庫統計
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

## 3. 訓練計劃 (Plans)

### 3.1 获取訓練計劃列表
**GET** `/plans`

### 3.2 获取单个訓練計劃
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

### 3.3 創建訓練計劃（AI生成）
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

### 3.4 更新計劃狀態
**PATCH** `/plans/:id/status`

**请求体**:
```json
{
  "status": "completed"
}
```

### 3.5 删除訓練計劃
**DELETE** `/plans/:id`

---

## 4. 練習會話 (Sessions)

### 4.1 創建練習會話
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

### 4.2 获取會話详情
**GET** `/sessions/:id`

### 4.3 提交答案
**POST** `/sessions/:id/submit`

**请求体**:
```json
{
  "answers": [
    {
      "question_id": 1,
      "answer": "學生的回答內容"
    }
  ]
}
```

### 4.4 完成會話
**POST** `/sessions/:id/complete`

### 4.5 获取會話列表
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
    "strengths": ["表達流畅", "邏輯清晰"],
    "weaknesses": ["詞汇量需提升", "缺乏具体例子"],
    "suggestions": ["建議多阅读英文原著"],
    "school_specific_advice": "針對SPCC的建議..."
  }
}
```

### 5.2 获取會話反馈
**GET** `/feedback/session/:session_id`

### 5.3 获取反馈列表
**GET** `/feedback?student_id=&date_from=&date_to=`

---

## 6. 進度追踪 (Progress)

### 6.1 获取進度統計
**GET** `/progress/stats?time_range=week&student_id=`

**時間范围**: `day`, `week`, `month`, `all`

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

## 7. AI 服務 (AI)

### 7.1 AI 生成學校檔案
**POST** `/ai/generate-school`

**请求体**:
```json
{
  "schoolName": "聖保羅男女中學"
}
```

### 7.2 AI 生成題目
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

### 7.3 AI 分析面試回憶
**POST** `/ai/extract-interview-memory`

**请求体**:
```json
{
  "text": "今天去了SPCC面試，遇到了以下問題...",
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
        "reference_answer": "參考答案要點",
        "tags": ["reading", "hobbies"],
        "notes": "學生回答了Harry Potter..."
      }
    ],
    "summary": "本次面試主要考察英文表達能力..."
  }
}
```

### 7.4 保存面試回憶題目到題庫
**POST** `/ai/save-interview-questions`

**请求体**:
```json
{
  "questions": [...],
  "source_text": "原始面試回憶文本"
}
```

### 7.5 测試 API 连接
**POST** `/ai/test-connection`

**请求体**:
```json
{
  "api_key": "sk-..."
}
```

---

## 8. 數據管理 (Data)

### 8.1 導入種子數據

#### 8.1.1 導入學校種子數據
**POST** `/data/seed-schools`

#### 8.1.2 導入題庫種子數據
**POST** `/data/seed-questions`

#### 8.1.3 導入所有種子數據
**POST** `/data/seed-all`

### 8.2 获取數據庫統計
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

### 8.3 導出所有數據
**GET** `/data/export`

**响应**: JSON文件下载

### 8.4 導入備份數據
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

**導入選項**:
- `merge: true` - 合并模式（保留现有數據，跳過重复）
- `overwrite: true` - 覆盖模式（清空现有數據後導入）

### 8.5 清空訓練數據
**DELETE** `/data/clear`

---

## 9. 係統设置 (Settings)

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

## 專項類別 (Categories)

係統支持七大專項類別：

| 代碼 | 中文名称 | 英文名称 |
|------|---------|---------|
| `english-oral` | 英文口語 | English Oral |
| `chinese-oral` | 中文表達 | Chinese Expression |
| `logic-thinking` | 邏輯思維 | Logical Thinking |
| `current-affairs` | 時事常識 | Current Affairs |
| `science-knowledge` | 科學常識 | Science Knowledge |
| `personal-growth` | 个人成長 | Personal Growth |
| `group-discussion` | 小組討論 | Group Discussion |

## 難度等级 (Difficulty)

| 代碼 | 中文名称 |
|------|---------|
| `easy` | 简单 |
| `medium` | 中等 |
| `hard` | 困難 |

## 學校代碼 (School Codes)

| 代碼 | 學校名称 |
|------|---------|
| `SPCC` | 聖保羅男女中學 (St. Paul's Co-educational College) |
| `QC` | 皇仁書院 (Queen's College) |
| `LSC` | 喇沙書院 (La Salle College) |
| `DBS` | 拔萃男書院 (Diocesan Boys' School) |
| `DGS` | 拔萃女書院 (Diocesan Girls' School) |

## 错误代碼

| HTTP狀態碼 | 說明 |
|-----------|------|
| 400 | 请求參數错误 |
| 401 | 未授权 |
| 404 | 資源不存在 |
| 429 | 请求频率超限 |
| 500 | 服務器內部错误 |

## 使用示例

### 創建訓練計劃并開始練習

```bash
# 1. 創建訓練計劃
curl -X POST http://localhost:3001/api/plans \
  -H "Content-Type: application/json" \
  -d '{
    "student_name": "张三",
    "target_school": "SPCC",
    "start_date": "2026-01-20",
    "end_date": "2026-03-15",
    "daily_duration": 30
  }'

# 2. 創建練習會話
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

# 4. 完成會話
curl -X POST http://localhost:3001/api/sessions/1/complete

# 5. 生成反馈
curl -X POST http://localhost:3001/api/feedback/generate \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "target_school": "SPCC"
  }'
```

## 注意事項

1. **API Key**: 所有AI相關功能需要配置DeepSeek API Key
2. **本地运行**: 係統设計为本地运行，不支持远程访問
3. **數據備份**: 建議定期導出數據備份
4. **网络连接**: AI功能需要网络连接
5. **并發限制**: 本地单用户使用，无并發限制

## 更新日志

### v1.0.0 (2026-01-25)
- 初始版本發布
- 完整的MVP功能
- 七大專項訓練
- AI智能生成和反馈
- 數據導入導出
- 面試回憶分析
