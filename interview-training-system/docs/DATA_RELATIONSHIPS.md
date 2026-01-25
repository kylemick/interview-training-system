# 数据关系梳理：Plan、Session、Question、Answer

## 数据关系图

```
training_plans (训练计划)
    │
    │ 1:N (一个计划有多个任务)
    │
    ▼
daily_tasks (每日任务)
    │
    │ 1:N (一个任务可以有多个会话，但通常只有一个进行中的)
    │
    ▼
sessions (练习会话)
    │
    │ 1:N (一个会话有多条问答记录)
    │
    ▼
qa_records (问答记录)
    │
    │ N:1 (多条记录关联一个题目)
    │
    ▼
questions (题目)
```

## 详细关系说明

### 1. training_plans (训练计划)
- **主键**: `id`
- **关联**: 
  - 1:N → `daily_tasks.plan_id`
  - 1:N → `qa_records.plan_id` (直接关联，用于快速查询)

### 2. daily_tasks (每日任务)
- **主键**: `id`
- **外键**: `plan_id` → `training_plans.id` (NOT NULL)
- **关联**:
  - N:1 → `training_plans.id`
  - 1:N → `sessions.task_id` (可选，自由练习时为空)

### 3. sessions (练习会话)
- **主键**: `id`
- **外键**: `task_id` → `daily_tasks.id` (可选，自由练习时为空)
- **字段**: `question_ids` (JSON数组，保存会话创建时选择的题目ID列表)
- **关联**:
  - N:1 → `daily_tasks.id` (可选)
  - 1:N → `qa_records.session_id`

### 4. questions (题目)
- **主键**: `id`
- **关联**:
  - 1:N → `qa_records.question_id` (可选)

### 5. qa_records (问答记录)
- **主键**: `id`
- **外键**:
  - `session_id` → `sessions.id` (NOT NULL)
  - `plan_id` → `training_plans.id` (可选，自由练习时为空)
  - `question_id` → `questions.id` (可选)
- **字段**:
  - `question_text`: 问题内容（冗余存储，避免题目被删除后丢失）
  - `answer_text`: 回答内容
  - `ai_feedback`: AI反馈（JSON格式）

## 数据流转流程

### 流程1: 从任务创建会话（任务练习）

```
1. 用户点击"开始任务"
   ↓
2. POST /api/plans/tasks/:taskId/start-practice
   - 获取任务信息（包含 plan_id）
   - 检查是否有进行中的会话
   - 如果没有，创建新会话：INSERT INTO sessions (task_id, category, question_ids, ...)
   ↓
3. 会话创建成功，返回 session_id 和 questions
   ↓
4. 用户提交答案
   POST /api/sessions/:id/answer
   - 获取会话信息：SELECT s.task_id, dt.plan_id FROM sessions s LEFT JOIN daily_tasks dt ON s.task_id = dt.id
   - 保存问答记录：INSERT INTO qa_records (session_id, plan_id, question_id, ...)
   ↓
5. 完成会话
   PATCH /api/sessions/:id/complete
   - 更新会话状态：UPDATE sessions SET status = 'completed'
   - 如果有关联任务：UPDATE daily_tasks SET status = 'completed'
```

### 流程2: 自由练习（无任务）

```
1. 用户选择"自由练习"
   ↓
2. POST /api/sessions
   - 创建会话：INSERT INTO sessions (task_id=NULL, category, question_ids, ...)
   ↓
3. 用户提交答案
   POST /api/sessions/:id/answer
   - 获取会话信息：SELECT s.task_id, dt.plan_id FROM sessions s LEFT JOIN daily_tasks dt ON s.task_id = dt.id
   - task_id 为 NULL，所以 plan_id 也为 NULL
   - 保存问答记录：INSERT INTO qa_records (session_id, plan_id=NULL, question_id, ...)
   ↓
4. 完成会话
   PATCH /api/sessions/:id/complete
   - 更新会话状态：UPDATE sessions SET status = 'completed'
   - 没有关联任务，不更新任务状态
```

## 关键约束和验证

### 1. plan_id 的获取逻辑

**在提交答案时** (`POST /api/sessions/:id/answer`):
```sql
SELECT s.id, s.task_id, dt.plan_id
FROM sessions s
LEFT JOIN daily_tasks dt ON s.task_id = dt.id
WHERE s.id = ?
```

**规则**:
- 如果 `session.task_id` 不为 NULL → 通过 `daily_tasks.plan_id` 获取
- 如果 `session.task_id` 为 NULL → `plan_id` 为 NULL（自由练习）

### 2. question_id 的关联

**在提交答案时**:
- 前端传递 `question_id`（来自 `questions` 表）
- 后端保存到 `qa_records.question_id`
- 同时保存 `question_text`（冗余存储，避免题目被删除后丢失）

### 3. 数据一致性检查

**应该满足的关系**:
```sql
-- 检查：所有有 task_id 的会话，其 qa_records 应该有 plan_id
SELECT qr.id, qr.session_id, qr.plan_id, s.task_id, dt.plan_id as task_plan_id
FROM qa_records qr
INNER JOIN sessions s ON qr.session_id = s.id
LEFT JOIN daily_tasks dt ON s.task_id = dt.id
WHERE s.task_id IS NOT NULL 
  AND (qr.plan_id IS NULL OR qr.plan_id != dt.plan_id);
```

## 修复脚本

如果发现数据不一致，可以使用以下脚本修复：

```sql
-- 修复：为所有有 task_id 的会话的 qa_records 更新 plan_id
UPDATE qa_records qr
INNER JOIN sessions s ON qr.session_id = s.id
INNER JOIN daily_tasks dt ON s.task_id = dt.id
SET qr.plan_id = dt.plan_id
WHERE qr.plan_id IS NULL OR qr.plan_id != dt.plan_id;
```

## API 端点说明

### 创建会话
- `POST /api/sessions` - 自由练习
- `POST /api/plans/tasks/:taskId/start-practice` - 从任务创建

### 提交答案
- `POST /api/sessions/:id/answer` - 自动关联 plan_id 和 question_id

### 完成会话
- `PATCH /api/sessions/:id/complete` - 自动更新任务状态（如果有关联）

### 查询
- `GET /api/sessions/:id` - 获取会话详情（包含 qa_records）
- `GET /api/plans/:id` - 获取计划详情（包含任务和会话信息）

## 最佳实践

1. **始终在提交答案时获取 plan_id**：通过 session -> task -> plan 的关联获取
2. **保存冗余数据**：在 `qa_records` 中保存 `question_text`，避免题目被删除后丢失
3. **验证数据一致性**：定期检查 `qa_records.plan_id` 是否与 `sessions.task_id -> daily_tasks.plan_id` 一致
4. **支持自由练习**：允许 `task_id` 和 `plan_id` 为 NULL，表示自由练习
