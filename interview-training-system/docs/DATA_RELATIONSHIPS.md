# 數據關係梳理：Plan、Session、Question、Answer

## 數據關係图

```
training_plans (訓練計劃)
    │
    │ 1:N (一个計劃有多个任務)
    │
    ▼
daily_tasks (每日任務)
    │
    │ 1:N (一个任務可以有多个會話，但通常只有一个進行中的)
    │
    ▼
sessions (練習會話)
    │
    │ 1:N (一个會話有多条問答記錄)
    │
    ▼
qa_records (問答記錄)
    │
    │ N:1 (多条記錄關聯一个題目)
    │
    ▼
questions (題目)
```

## 详细關係說明

### 1. training_plans (訓練計劃)
- **主键**: `id`
- **關聯**: 
  - 1:N → `daily_tasks.plan_id`
  - 1:N → `qa_records.plan_id` (直接關聯，用于快速查询)

### 2. daily_tasks (每日任務)
- **主键**: `id`
- **外键**: `plan_id` → `training_plans.id` (NOT NULL)
- **關聯**:
  - N:1 → `training_plans.id`
  - 1:N → `sessions.task_id` (可選，自由練習時为空)

### 3. sessions (練習會話)
- **主键**: `id`
- **外键**: `task_id` → `daily_tasks.id` (可選，自由練習時为空)
- **字段**: `question_ids` (JSON數組，保存會話創建時選擇的題目ID列表)
- **關聯**:
  - N:1 → `daily_tasks.id` (可選)
  - 1:N → `qa_records.session_id`

### 4. questions (題目)
- **主键**: `id`
- **關聯**:
  - 1:N → `qa_records.question_id` (可選)

### 5. qa_records (問答記錄)
- **主键**: `id`
- **外键**:
  - `session_id` → `sessions.id` (NOT NULL)
  - `plan_id` → `training_plans.id` (可選，自由練習時为空)
  - `question_id` → `questions.id` (可選)
- **字段**:
  - `question_text`: 問題內容（冗余存储，避免題目被删除後丢失）
  - `answer_text`: 回答內容
  - `ai_feedback`: AI反馈（JSON格式）

## 數據流转流程

### 流程1: 從任務創建會話（任務練習）

```
1. 用户點击"開始任務"
   ↓
2. POST /api/plans/tasks/:taskId/start-practice
   - 获取任務信息（包含 plan_id）
   - 检查是否有進行中的會話
   - 如果没有，創建新會話：INSERT INTO sessions (task_id, category, question_ids, ...)
   ↓
3. 會話創建成功，返回 session_id 和 questions
   ↓
4. 用户提交答案
   POST /api/sessions/:id/answer
   - 获取會話信息：SELECT s.task_id, dt.plan_id FROM sessions s LEFT JOIN daily_tasks dt ON s.task_id = dt.id
   - 保存問答記錄：INSERT INTO qa_records (session_id, plan_id, question_id, ...)
   ↓
5. 完成會話
   PATCH /api/sessions/:id/complete
   - 更新會話狀態：UPDATE sessions SET status = 'completed'
   - 如果有關聯任務：UPDATE daily_tasks SET status = 'completed'
```

### 流程2: 自由練習（无任務）

```
1. 用户選擇"自由練習"
   ↓
2. POST /api/sessions
   - 創建會話：INSERT INTO sessions (task_id=NULL, category, question_ids, ...)
   ↓
3. 用户提交答案
   POST /api/sessions/:id/answer
   - 获取會話信息：SELECT s.task_id, dt.plan_id FROM sessions s LEFT JOIN daily_tasks dt ON s.task_id = dt.id
   - task_id 为 NULL，所以 plan_id 也为 NULL
   - 保存問答記錄：INSERT INTO qa_records (session_id, plan_id=NULL, question_id, ...)
   ↓
4. 完成會話
   PATCH /api/sessions/:id/complete
   - 更新會話狀態：UPDATE sessions SET status = 'completed'
   - 没有關聯任務，不更新任務狀態
```

## 關键约束和验证

### 1. plan_id 的获取邏輯

**在提交答案時** (`POST /api/sessions/:id/answer`):
```sql
SELECT s.id, s.task_id, dt.plan_id
FROM sessions s
LEFT JOIN daily_tasks dt ON s.task_id = dt.id
WHERE s.id = ?
```

**規則**:
- 如果 `session.task_id` 不为 NULL → 通過 `daily_tasks.plan_id` 获取
- 如果 `session.task_id` 为 NULL → `plan_id` 为 NULL（自由練習）

### 2. question_id 的關聯

**在提交答案時**:
- 前端傳递 `question_id`（來自 `questions` 表）
- 後端保存到 `qa_records.question_id`
- 同時保存 `question_text`（冗余存储，避免題目被删除後丢失）

### 3. 數據一致性检查

**应该满足的關係**:
```sql
-- 检查：所有有 task_id 的會話，其 qa_records 应该有 plan_id
SELECT qr.id, qr.session_id, qr.plan_id, s.task_id, dt.plan_id as task_plan_id
FROM qa_records qr
INNER JOIN sessions s ON qr.session_id = s.id
LEFT JOIN daily_tasks dt ON s.task_id = dt.id
WHERE s.task_id IS NOT NULL 
  AND (qr.plan_id IS NULL OR qr.plan_id != dt.plan_id);
```

## 修复脚本

如果發现數據不一致，可以使用以下脚本修复：

```sql
-- 修复：为所有有 task_id 的會話的 qa_records 更新 plan_id
UPDATE qa_records qr
INNER JOIN sessions s ON qr.session_id = s.id
INNER JOIN daily_tasks dt ON s.task_id = dt.id
SET qr.plan_id = dt.plan_id
WHERE qr.plan_id IS NULL OR qr.plan_id != dt.plan_id;
```

## API 端點說明

### 創建會話
- `POST /api/sessions` - 自由練習
- `POST /api/plans/tasks/:taskId/start-practice` - 從任務創建

### 提交答案
- `POST /api/sessions/:id/answer` - 自動關聯 plan_id 和 question_id

### 完成會話
- `PATCH /api/sessions/:id/complete` - 自動更新任務狀態（如果有關聯）

### 查询
- `GET /api/sessions/:id` - 获取會話详情（包含 qa_records）
- `GET /api/plans/:id` - 获取計劃详情（包含任務和會話信息）

## 最佳实践

1. **始终在提交答案時获取 plan_id**：通過 session -> task -> plan 的關聯获取
2. **保存冗余數據**：在 `qa_records` 中保存 `question_text`，避免題目被删除後丢失
3. **验证數據一致性**：定期检查 `qa_records.plan_id` 是否与 `sessions.task_id -> daily_tasks.plan_id` 一致
4. **支持自由練習**：允许 `task_id` 和 `plan_id` 为 NULL，表示自由練習
