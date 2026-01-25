# qa_records 表關聯關係說明

## 表結构

```sql
CREATE TABLE qa_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL COMMENT '關聯會話',
  plan_id INT COMMENT '關聯訓練計劃（通過 session -> task -> plan 關聯）',
  question_id INT COMMENT '關聯題目(可選)',
  question_text TEXT NOT NULL COMMENT '問題內容',
  answer_text TEXT NOT NULL COMMENT '回答內容',
  response_time INT COMMENT '回答時長(秒)',
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

## 關聯關係

### 1. session_id → sessions.id (必须關聯)

- **類型**: `INT NOT NULL`
- **外键**: `FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE`
- **說明**: 
  - 每条問答記錄必须關聯一个會話
  - 当會話被删除時，相關的問答記錄會自動删除（CASCADE）
- **用途**: 
  - 標識这条記錄属于哪个練習會話
  - 用于查询某个會話的所有問答記錄

### 2. plan_id → training_plans.id (可選關聯)

- **類型**: `INT NULL`
- **外键**: `FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE SET NULL`
- **說明**: 
  - 可選字段，用于直接關聯訓練計劃
  - 任務練習：通過 `session -> task -> plan` 获取并保存
  - 自由練習：为 `NULL`（因为没有關聯任務）
  - 当計劃被删除時，`plan_id` 會被设置为 `NULL`（SET NULL）
- **用途**: 
  - 快速查询某个計劃的所有問答記錄（无需通過 session -> task -> plan 多层關聯）
  - 在訓練計劃详情中直接显示所有相關的練習記錄
  - 提高查询效率

### 3. question_id → questions.id (可選關聯)

- **類型**: `INT NULL`
- **外键**: `FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL`
- **說明**: 
  - 可選字段，關聯題目ID
  - 当題目被删除時，`question_id` 會被设置为 `NULL`（SET NULL）
  - 但 `question_text` 會保留（冗余存储），避免題目删除後丢失問題內容
- **用途**: 
  - 標識这条記錄回答的是哪个題目
  - 用于查询某个題目的所有回答記錄
  - 用于統計題目被回答的次數

## 數據關係图

```
qa_records (問答記錄)
    │
    ├─ session_id (必须) → sessions.id
    │   └─ 一个會話有多条問答記錄 (1:N)
    │
    ├─ plan_id (可選) → training_plans.id
    │   └─ 一个計劃有多条問答記錄 (1:N)
    │   └─ 通過 session -> task -> plan 获取
    │
    └─ question_id (可選) → questions.id
        └─ 一个題目有多条回答記錄 (1:N)
```

## 關聯获取邏輯

### 提交答案時 (POST /api/sessions/:id/answer)

```sql
-- 获取 plan_id
SELECT s.id, s.task_id, dt.plan_id
FROM sessions s
LEFT JOIN daily_tasks dt ON s.task_id = dt.id
WHERE s.id = ?

-- 保存記錄
INSERT INTO qa_records (session_id, plan_id, question_id, question_text, answer_text, response_time)
VALUES (?, ?, ?, ?, ?, ?)
```

### 完成會話時 (PATCH /api/sessions/:id/complete)

```sql
-- 自動修复该會話所有記錄的 plan_id
UPDATE qa_records qr
SET qr.plan_id = ?
WHERE qr.session_id = ? 
  AND (qr.plan_id IS NULL OR qr.plan_id != ?)
```

## 查询示例

### 查询某个會話的所有問答記錄
```sql
SELECT * FROM qa_records WHERE session_id = ?
```

### 查询某个計劃的所有問答記錄
```sql
SELECT * FROM qa_records WHERE plan_id = ?
```

### 查询某个題目的所有回答記錄
```sql
SELECT * FROM qa_records WHERE question_id = ?
```

### 查询某个會話的某个題目的回答記錄
```sql
SELECT * FROM qa_records 
WHERE session_id = ? AND question_id = ?
ORDER BY created_at DESC
```

## 字段說明

### 冗余存储字段

- **question_text**: 問題內容（冗余存储）
  - 即使 `question_id` 關聯的題目被删除，問題內容仍然保留
  - 避免历史數據丢失

### 其他字段

- **answer_text**: 回答內容
- **response_time**: 回答時長（秒）
- **ai_feedback**: AI反馈（JSON格式）
- **created_at**: 創建時間

## 索引

- `idx_session_id`: 優化按會話查询
- `idx_plan_id`: 優化按計劃查询
- `idx_question_id`: 優化按題目查询

## 數據完整性

### 必须關聯
- ✅ `session_id` 必须存在且有效

### 可選關聯
- ⚠️ `plan_id` 可以为 NULL（自由練習）
- ⚠️ `question_id` 可以为 NULL（舊數據或手動創建）

### 數據一致性規則

1. **任務練習**:
   - `session.task_id` 不为 NULL
   - `qa_records.plan_id` 应该等于 `daily_tasks.plan_id`
   - `qa_records.question_id` 应该在 `sessions.question_ids` 中

2. **自由練習**:
   - `session.task_id` 为 NULL
   - `qa_records.plan_id` 为 NULL
   - `qa_records.question_id` 可以为任意值
