# API 接口规范

## 基础信息

- **Base URL**: `http://localhost:3001/api`
- **Content-Type**: `application/json`
- **字符编码**: UTF-8

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

### 1. 学校特征 (Schools)

#### GET /api/schools
获取所有学校列表
```
Response: {
  "data": [
    {
      "id": "uuid",
      "schoolCode": "SPCC",
      "schoolName": "圣保罗男女中学",
      "schoolType": "co-ed",
      "interviewFormat": {...},
      "focusAreas": [...],
      "scoringStandards": {...}
    }
  ]
}
```

#### GET /api/schools/:schoolCode
获取指定学校详情

#### POST /api/schools
创建学校特征

#### PUT /api/schools/:id
更新学校特征

### 2. 题库 (Questions)

#### GET /api/questions
获取题目列表
```
Query Parameters:
- category: string (专项类别)
- difficulty: number (难度1-5)
- schoolCode: string (学校代码)
- limit: number (返回数量，默认20)
- offset: number (偏移量，默认0)
```

#### GET /api/questions/:id
获取题目详情

#### POST /api/questions
创建题目

#### POST /api/questions/generate
AI生成题目
```
Body: {
  "category": "english-oral",
  "count": 10,
  "difficulty": 3,
  "schoolCode": "SPCC"
}
```

#### POST /api/questions/extract-from-memory
从面试回忆提取题目
```
Body: {
  "rawText": "面试回忆文本...",
  "schoolCode": "SPCC",
  "category": "english-oral"
}
```

### 3. 训练计划 (Plans)

#### GET /api/plans
获取训练计划列表
```
Query Parameters:
- status: string (active, completed, archived)
```

#### GET /api/plans/:id
获取计划详情

#### POST /api/plans
创建训练计划
```
Body: {
  "studentName": "学生姓名",
  "targetSchool": "SPCC",
  "startDate": "2026-01-25",
  "interviewDate": "2026-03-15",
  "weeklyHours": 5
}
```

#### POST /api/plans/:id/generate
AI生成计划内容

#### PUT /api/plans/:id
更新训练计划

#### GET /api/plans/:id/today
获取今日任务

#### POST /api/plans/:id/adjust
调整训练计划

### 4. 练习会话 (Sessions)

#### GET /api/sessions
获取会话列表

#### GET /api/sessions/:id
获取会话详情

#### POST /api/sessions
开始新会话
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
  "questionText": "问题",
  "studentAnswer": "学生回答"
}
```

#### POST /api/sessions/:id/complete
完成会话

#### POST /api/sessions/:id/pause
暂停会话

### 5. 反馈 (Feedback)

#### GET /api/feedback/sessions/:sessionId
获取会话反馈

#### GET /api/feedback/qa/:qaRecordId
获取单题反馈

#### POST /api/feedback/generate
生成反馈
```
Body: {
  "question": "题目",
  "answer": "回答",
  "category": "english-oral",
  "targetSchool": "SPCC"
}
```

### 6. 进度追踪 (Progress)

#### GET /api/progress/overview
获取进度概览
```
Query Parameters:
- planId: string
- days: number (默认30)
```

#### GET /api/progress/by-category
按类别统计进度

#### GET /api/progress/weaknesses
获取弱点分析

#### GET /api/progress/milestones
获取里程碑成就

### 7. 面试回忆 (Interview Memory)

#### POST /api/memory
提交面试回忆
```
Body: {
  "schoolCode": "SPCC",
  "category": "english-oral",
  "rawText": "面试回忆文本..."
}
```

#### GET /api/memory
获取面试回忆列表

#### GET /api/memory/:id
获取回忆详情

### 8. 系统 (System)

#### GET /health
健康检查

#### GET /api/stats
获取系统统计信息

## 错误代码

| 代码 | 说明 |
|------|------|
| VALIDATION_ERROR | 请求参数验证失败 |
| NOT_FOUND | 资源不存在 |
| INTERNAL_SERVER_ERROR | 服务器内部错误 |
| API_KEY_MISSING | DeepSeek API key未配置 |
| DEEPSEEK_API_ERROR | DeepSeek API调用失败 |
| DATABASE_ERROR | 数据库操作失败 |

## 数据类型

### Category (专项类别和学科能力类别)

系统支持以下类别：

**七大专项类别：**
- `english-oral` - 英文口语
- `chinese-oral` - 中文表达
- `logic-thinking` - 逻辑思维
- `current-affairs` - 时事常识
- `science-knowledge` - 科学常识
- `personal-growth` - 个人成长
- `group-discussion` - 小组讨论

**四个学科能力类别：**
- `chinese-reading` - 中文阅读理解
- `english-reading` - 英文阅读理解
- `mathematics` - 数学基础
- `science-practice` - 科学实践
- `english-oral` - 英文口语
- `chinese-oral` - 中文表达
- `logic-thinking` - 逻辑思维
- `current-affairs` - 时事常识
- `science-knowledge` - 科学常识
- `personal-growth` - 个人成长
- `group-discussion` - 小组讨论

### Difficulty (难度)
- `1` - 很简单
- `2` - 简单
- `3` - 中等
- `4` - 困难
- `5` - 很困难

### Status (状态)
- Training Plan: `active`, `completed`, `archived`
- Daily Task: `pending`, `in_progress`, `completed`
- Session: `in_progress`, `completed`, `paused`
