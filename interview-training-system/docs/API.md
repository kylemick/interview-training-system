# API 接口規范

## 基础信息

- **Base URL**: `http://localhost:3001/api`
- **Content-Type**: `application/json`
- **字符编碼**: UTF-8

## 通用响应格式

### 成功响应
```json
{
  "data": {...},
  "message": "操作成功"
}
```

### 错误响应
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  }
}
```

## 接口列表

### 1. 學校特征 (Schools)

#### GET /api/schools
获取所有學校列表
```
Response: {
  "data": [
    {
      "id": "uuid",
      "schoolCode": "SPCC",
      "schoolName": "聖保羅男女中學",
      "schoolType": "co-ed",
      "interviewFormat": {...},
      "focusAreas": [...],
      "scoringStandards": {...}
    }
  ]
}
```

#### GET /api/schools/:schoolCode
获取指定學校详情

#### POST /api/schools
創建學校特征

#### PUT /api/schools/:id
更新學校特征

### 2. 題庫 (Questions)

#### GET /api/questions
获取題目列表
```
Query Parameters:
- category: string (專項類別)
- difficulty: number (難度1-5)
- schoolCode: string (學校代碼)
- limit: number (返回數量，默认20)
- offset: number (偏移量，默认0)
```

#### GET /api/questions/:id
获取題目详情

#### POST /api/questions
創建題目

#### POST /api/questions/generate
AI生成題目
```
Body: {
  "category": "english-oral",
  "count": 10,
  "difficulty": 3,
  "schoolCode": "SPCC"
}
```

#### POST /api/questions/extract-from-memory
從面試回憶提取題目
```
Body: {
  "rawText": "面試回憶文本...",
  "schoolCode": "SPCC",
  "category": "english-oral"
}
```

### 3. 訓練計劃 (Plans)

#### GET /api/plans
获取訓練計劃列表
```
Query Parameters:
- status: string (active, completed, archived)
```

#### GET /api/plans/:id
获取計劃详情

#### POST /api/plans
創建訓練計劃
```
Body: {
  "studentName": "學生姓名",
  "targetSchool": "SPCC",
  "startDate": "2026-01-25",
  "interviewDate": "2026-03-15",
  "weeklyHours": 5
}
```

#### POST /api/plans/:id/generate
AI生成計劃內容

#### PUT /api/plans/:id
更新訓練計劃

#### GET /api/plans/:id/today
获取今日任務

#### POST /api/plans/:id/adjust
調整訓練計劃

### 4. 練習會話 (Sessions)

#### GET /api/sessions
获取會話列表

#### GET /api/sessions/:id
获取會話详情

#### POST /api/sessions
開始新會話
```
Body: {
  "planId": "uuid",
  "taskId": "uuid",
  "category": "english-oral",
  "mode": "text-qa",
  "questionCount": 10
}
```

#### POST /api/sessions/:id/answers
提交答案
```
Body: {
  "questionId": "uuid",
  "questionText": "問題",
  "studentAnswer": "學生回答"
}
```

#### POST /api/sessions/:id/complete
完成會話

#### POST /api/sessions/:id/pause
暫停會話

### 5. 反馈 (Feedback)

#### GET /api/feedback/sessions/:sessionId
获取會話反馈

#### GET /api/feedback/qa/:qaRecordId
获取单題反馈

#### POST /api/feedback/generate
生成反馈
```
Body: {
  "question": "題目",
  "answer": "回答",
  "category": "english-oral",
  "targetSchool": "SPCC"
}
```

### 6. 進度追踪 (Progress)

#### GET /api/progress/overview
获取進度概览
```
Query Parameters:
- planId: string
- days: number (默认30)
```

#### GET /api/progress/by-category
按類別統計進度

#### GET /api/progress/weaknesses
获取弱點分析

#### GET /api/progress/milestones
获取里程碑成就

### 7. 面試回憶 (Interview Memory)

#### POST /api/memory
提交面試回憶
```
Body: {
  "schoolCode": "SPCC",
  "category": "english-oral",
  "rawText": "面試回憶文本..."
}
```

#### GET /api/memory
获取面試回憶列表

#### GET /api/memory/:id
获取回憶详情

### 8. 係統 (System)

#### GET /health
健康检查

#### GET /api/stats
获取係統統計信息

## 错误代碼

| 代碼 | 說明 |
|------|------|
| VALIDATION_ERROR | 请求參數验证失敗 |
| NOT_FOUND | 資源不存在 |
| INTERNAL_SERVER_ERROR | 服務器內部错误 |
| API_KEY_MISSING | DeepSeek API key未配置 |
| DEEPSEEK_API_ERROR | DeepSeek API調用失敗 |
| DATABASE_ERROR | 數據庫操作失敗 |

## 數據類型

### Category (專項類別和學科能力類別)

係統支持以下類別：

**七大專項類別：**
- `english-oral` - 英文口語
- `chinese-oral` - 中文表達
- `logic-thinking` - 邏輯思維
- `current-affairs` - 時事常識
- `science-knowledge` - 科學常識
- `personal-growth` - 个人成長
- `group-discussion` - 小組討論

**四个學科能力類別：**
- `chinese-reading` - 中文阅读理解
- `english-reading` - 英文阅读理解
- `mathematics` - 數學基础
- `science-practice` - 科學实践
- `english-oral` - 英文口語
- `chinese-oral` - 中文表達
- `logic-thinking` - 邏輯思維
- `current-affairs` - 時事常識
- `science-knowledge` - 科學常識
- `personal-growth` - 个人成長
- `group-discussion` - 小組討論

### Difficulty (難度)
- `1` - 很简单
- `2` - 简单
- `3` - 中等
- `4` - 困難
- `5` - 很困難

### Status (狀態)
- Training Plan: `active`, `completed`, `archived`
- Daily Task: `pending`, `in_progress`, `completed`
- Session: `in_progress`, `completed`, `paused`
