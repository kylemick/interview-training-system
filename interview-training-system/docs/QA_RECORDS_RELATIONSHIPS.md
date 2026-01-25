# qa_records 表关联关系说明

## 表结构

```sql
CREATE TABLE qa_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL COMMENT '关联会话',
  plan_id INT COMMENT '关联训练计划（通过 session -> task -> plan 关联）',
  question_id INT COMMENT '关联题目(可选)',
  question_text TEXT NOT NULL COMMENT '问题内容',
  answer_text TEXT NOT NULL COMMENT '回答内容',
  response_time INT COMMENT '回答时长(秒)',
  ai_feedback JSON COMMENT 'AI反馈',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_id (session_id),
  INDEX idx_plan_id (plan_id),
  INDEX idx_question_id (question_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE SET NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL
)
```

## 关联关系

### 1. session_id → sessions.id (必须关联)

- **类型**: `INT NOT NULL`
- **外键**: `FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE`
- **说明**: 
  - 每条问答记录必须关联一个会话
  - 当会话被删除时，相关的问答记录会自动删除（CASCADE）
- **用途**: 
  - 标识这条记录属于哪个练习会话
  - 用于查询某个会话的所有问答记录

### 2. plan_id → training_plans.id (可选关联)

- **类型**: `INT NULL`
- **外键**: `FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE SET NULL`
- **说明**: 
  - 可选字段，用于直接关联训练计划
  - 任务练习：通过 `session -> task -> plan` 获取并保存
  - 自由练习：为 `NULL`（因为没有关联任务）
  - 当计划被删除时，`plan_id` 会被设置为 `NULL`（SET NULL）
- **用途**: 
  - 快速查询某个计划的所有问答记录（无需通过 session -> task -> plan 多层关联）
  - 在训练计划详情中直接显示所有相关的练习记录
  - 提高查询效率

### 3. question_id → questions.id (可选关联)

- **类型**: `INT NULL`
- **外键**: `FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL`
- **说明**: 
  - 可选字段，关联题目ID
  - 当题目被删除时，`question_id` 会被设置为 `NULL`（SET NULL）
  - 但 `question_text` 会保留（冗余存储），避免题目删除后丢失问题内容
- **用途**: 
  - 标识这条记录回答的是哪个题目
  - 用于查询某个题目的所有回答记录
  - 用于统计题目被回答的次数

## 数据关系图

```
qa_records (问答记录)
    │
    ├─ session_id (必须) → sessions.id
    │   └─ 一个会话有多条问答记录 (1:N)
    │
    ├─ plan_id (可选) → training_plans.id
    │   └─ 一个计划有多条问答记录 (1:N)
    │   └─ 通过 session -> task -> plan 获取
    │
    └─ question_id (可选) → questions.id
        └─ 一个题目有多条回答记录 (1:N)
```

## 关联获取逻辑

### 提交答案时 (POST /api/sessions/:id/answer)

```sql
-- 获取 plan_id
SELECT s.id, s.task_id, dt.plan_id
FROM sessions s
LEFT JOIN daily_tasks dt ON s.task_id = dt.id
WHERE s.id = ?

-- 保存记录
INSERT INTO qa_records (session_id, plan_id, question_id, question_text, answer_text, response_time)
VALUES (?, ?, ?, ?, ?, ?)
```

### 完成会话时 (PATCH /api/sessions/:id/complete)

```sql
-- 自动修复该会话所有记录的 plan_id
UPDATE qa_records qr
SET qr.plan_id = ?
WHERE qr.session_id = ? 
  AND (qr.plan_id IS NULL OR qr.plan_id != ?)
```

## 查询示例

### 查询某个会话的所有问答记录
```sql
SELECT * FROM qa_records WHERE session_id = ?
```

### 查询某个计划的所有问答记录
```sql
SELECT * FROM qa_records WHERE plan_id = ?
```

### 查询某个题目的所有回答记录
```sql
SELECT * FROM qa_records WHERE question_id = ?
```

### 查询某个会话的某个题目的回答记录
```sql
SELECT * FROM qa_records 
WHERE session_id = ? AND question_id = ?
ORDER BY created_at DESC
```

## 字段说明

### 冗余存储字段

- **question_text**: 问题内容（冗余存储）
  - 即使 `question_id` 关联的题目被删除，问题内容仍然保留
  - 避免历史数据丢失

### 其他字段

- **answer_text**: 回答内容
- **response_time**: 回答时长（秒）
- **ai_feedback**: AI反馈（JSON格式）
- **created_at**: 创建时间

## 索引

- `idx_session_id`: 优化按会话查询
- `idx_plan_id`: 优化按计划查询
- `idx_question_id`: 优化按题目查询

## 数据完整性

### 必须关联
- ✅ `session_id` 必须存在且有效

### 可选关联
- ⚠️ `plan_id` 可以为 NULL（自由练习）
- ⚠️ `question_id` 可以为 NULL（旧数据或手动创建）

### 数据一致性规则

1. **任务练习**:
   - `session.task_id` 不为 NULL
   - `qa_records.plan_id` 应该等于 `daily_tasks.plan_id`
   - `qa_records.question_id` 应该在 `sessions.question_ids` 中

2. **自由练习**:
   - `session.task_id` 为 NULL
   - `qa_records.plan_id` 为 NULL
   - `qa_records.question_id` 可以为任意值
