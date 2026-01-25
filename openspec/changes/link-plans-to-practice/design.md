# Design: 计划和练习联动

## Context

当前系统中,训练计划生成器会创建每日任务(`daily_tasks`表),但这些任务与练习会话(`sessions`表)没有实质性的联动。用户创建计划后,仍需要手动选择类别进行练习,无法体验到计划的指导价值。

**现有数据模型:**
- `training_plans`: 训练计划主表
- `daily_tasks`: 每日任务表,包含`plan_id`, `category`, `duration`, `status`等字段
- `sessions`: 练习会话表,包含可选的`task_id`外键,但当前未强制使用

**用户痛点:**
1. 创建计划后,不知道应该做什么
2. 练习时需要重复选择类别和题目数量
3. 计划的完成进度与实际练习不同步
4. 无法追踪"按计划练习"vs"自由练习"的数据

## Goals / Non-Goals

**Goals:**
- 将计划和练习连接起来,形成闭环用户体验
- 用户可以一键从计划任务进入练习
- 完成练习后自动更新任务状态
- 保留灵活性,允许自由练习
- 提供清晰的任务进度可视化

**Non-Goals:**
- 不强制用户必须按计划练习(仍支持自由模式)
- 不改变现有的题目生成和反馈逻辑
- 不引入复杂的任务依赖关系(如必须完成任务A才能开始任务B)
- 不做实时协作或多用户任务分配

## Decisions

### 1. 任务驱动的练习入口

**决策**: 在Dashboard和训练计划页面,为每个未完成任务提供"开始练习"按钮

**实现方式:**

**Dashboard 今日任务卡片:**
```
┌─────────────────────────────────────┐
│  📅 今日任务 (3个待完成)            │
├─────────────────────────────────────┤
│  ✅ 英文口语 (20分钟)  [已完成]     │
│  ⏳ 科学常识 (15分钟)  [开始练习]   │
│  ⏳ 逻辑思维 (15分钟)  [开始练习]   │
└─────────────────────────────────────┘
```

**训练计划详情页日历视图:**
```
2026-01-25 (今日)
├─ 英文口语 (20分钟) ✅ 已完成
├─ 科学常识 (15分钟) [开始] [跳过]
└─ 逻辑思维 (15分钟) [开始] [跳过]
```

**API设计:**
```typescript
// 获取未完成任务
GET /api/plans/pending-tasks?date=2026-01-25
Response: {
  tasks: [
    {
      id: 123,
      plan_id: 45,
      category: 'science-knowledge',
      duration: 15,
      status: 'pending',
      plan_name: 'SPCC冲刺计划',
      target_school: 'SPCC'
    }
  ]
}

// 从任务创建会话
POST /api/plans/tasks/:taskId/start-practice
Response: {
  session_id: 789,
  task_id: 123,
  questions: [...],
  task_info: { category, duration, plan_name }
}
```

**原因:**
- 降低用户认知负担,直接告诉用户"现在该做什么"
- 一键启动,减少操作步骤
- 任务信息自动传递到练习页面,无需用户重复选择

### 2. 会话-任务自动关联和状态同步

**决策**: 从任务创建的会话自动关联`task_id`,完成会话时自动标记任务完成

**实现流程:**

```
用户点击"开始练习"
  ↓
前端: navigate(/practice?taskId=123)
  ↓
前端: 检测到taskId参数,调用 POST /api/plans/tasks/123/start-practice
  ↓
后端: 创建会话,设置 task_id=123,从任务的category选择题目
  ↓
返回: session_id + questions + task_info
  ↓
前端: 显示练习界面 + 任务信息横幅
  ↓
用户完成练习
  ↓
前端: 调用 PATCH /api/sessions/:id/complete
  ↓
后端: 
  1. 更新 sessions.status='completed'
  2. 如果 sessions.task_id 存在,更新 daily_tasks.status='completed'
  3. 返回成功
  ↓
前端: 显示"任务已完成"提示 + 检查是否有下一个任务
```

**数据库变更:**
```sql
-- 确保外键约束存在
ALTER TABLE sessions 
  ADD CONSTRAINT fk_sessions_task_id 
  FOREIGN KEY (task_id) REFERENCES daily_tasks(id) 
  ON DELETE SET NULL;

-- 添加索引优化查询
CREATE INDEX idx_sessions_task_id ON sessions(task_id);
CREATE INDEX idx_daily_tasks_status_date ON daily_tasks(status, task_date);
```

**后端逻辑更新:**
```typescript
// routes/sessions.ts
router.patch('/:id/complete', async (req, res) => {
  const session = await queryOne('SELECT id, task_id FROM sessions WHERE id = ?', [id]);
  
  // 更新会话状态
  await execute('UPDATE sessions SET status = ?, end_time = NOW() WHERE id = ?', ['completed', id]);
  
  // 如果关联了任务,自动标记任务完成
  if (session.task_id) {
    await execute(
      'UPDATE daily_tasks SET status = ?, completed_at = NOW() WHERE id = ?',
      ['completed', session.task_id]
    );
  }
  
  res.json({ success: true });
});
```

**原因:**
- 实现计划和练习的数据同步
- 减少手动更新任务状态的操作
- 为进度追踪提供准确数据

### 3. 双模式: 任务练习 vs 自由练习

**决策**: 保留两种练习入口,支持不同使用场景

**入口1: 任务练习 (Task-based Practice)**
- 来源: Dashboard、训练计划页面的"开始任务"按钮
- URL: `/practice?taskId=123`
- 行为: 自动加载任务对应的类别和题目,显示任务信息横幅
- 完成后: 自动标记任务完成

**入口2: 自由练习 (Free Practice)**
- 来源: 侧边栏"练习"菜单、练习页面的"自由练习"按钮
- URL: `/practice`(无taskId参数)
- 行为: 用户手动选择类别、题目数量,不关联任务
- 完成后: 仅保存会话记录,不影响任务状态

**前端实现:**
```typescript
// Practice/index.tsx
const Practice = () => {
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');
  const [practiceMode, setPracticeMode] = useState<'task' | 'free'>(taskId ? 'task' : 'free');
  
  useEffect(() => {
    if (taskId) {
      // 任务模式: 自动加载任务信息
      loadTaskAndStartPractice(taskId);
    } else {
      // 自由模式: 显示选择界面
      setStep('select');
    }
  }, [taskId]);
  
  // ...
}
```

**UI设计:**

任务模式顶部横幅:
```
┌─────────────────────────────────────────────────────────┐
│ 📋 任务练习: SPCC冲刺计划 > 2026-01-25 > 科学常识 (15分钟) │
│ 进度: 3/10 题                                            │
└─────────────────────────────────────────────────────────┘
```

自由模式选择界面:
```
┌─────────────────────────────────────┐
│  🎯 选择专项类别                     │
│  [英文口语] [中文表达] [逻辑思维]...  │
│                                      │
│  题目数量: 10                        │
│  [开始自由练习]                      │
└─────────────────────────────────────┘
```

**原因:**
- 满足不同需求场景(计划驱动 vs 随机练习)
- 不强制用户必须创建计划才能练习
- 保持系统灵活性,避免过度约束

### 4. 任务状态流转和可视化

**决策**: 明确任务的三种状态,并在UI中清晰展示

**状态定义:**
```typescript
type TaskStatus = 'pending' | 'in_progress' | 'completed';

- pending: 未开始,显示"开始练习"按钮
- in_progress: 已创建会话但未完成,显示"继续练习"按钮
- completed: 已完成,显示"✅ 已完成"标记
```

**状态转换:**
```
pending --[创建会话]--> in_progress --[完成会话]--> completed
            ↓                              ↑
        [关联session_id]              [自动更新]
```

**实现细节:**
```sql
-- 修改daily_tasks表,添加关联会话字段(可选)
ALTER TABLE daily_tasks ADD COLUMN session_id INT DEFAULT NULL;
ALTER TABLE daily_tasks ADD CONSTRAINT fk_task_session 
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL;
```

**API支持:**
```typescript
// 获取任务详情,包含关联会话信息
GET /api/plans/tasks/:taskId
Response: {
  task: {
    id: 123,
    status: 'in_progress',
    session_id: 789,  // 如果存在未完成的会话
    session_progress: { answered: 3, total: 10 }
  }
}
```

**UI展示:**
```
Dashboard 任务卡片:
- pending: 🔵 [开始练习]
- in_progress: 🟡 [继续练习] (进度: 3/10)
- completed: ✅ 已完成
```

**原因:**
- 清晰的状态流转,用户知道当前进度
- 支持暂停和恢复练习
- 为后续"任务恢复"功能打下基础

### 5. 任务完成后的流程引导

**决策**: 完成一个任务后,智能提示下一步操作

**完成后逻辑:**
```typescript
// 前端: 完成会话后
const onCompleteSession = async () => {
  await api.sessions.complete(sessionId);
  
  // 检查是否还有今日未完成任务
  const pendingTasks = await api.plans.getPendingTasks({ date: today });
  
  if (pendingTasks.length > 0) {
    // 显示Modal: "任务已完成!是否继续下一个任务?"
    Modal.confirm({
      title: '🎉 任务已完成!',
      content: `还有 ${pendingTasks.length} 个任务待完成,是否继续?`,
      okText: '继续下一个',
      cancelText: '稍后再练',
      onOk: () => navigate(`/practice?taskId=${pendingTasks[0].id}`),
      onCancel: () => navigate('/dashboard'),
    });
  } else {
    // 显示庆祝动画: "🎊 今日任务全部完成!"
    showSuccessAnimation();
    setTimeout(() => navigate('/dashboard'), 2000);
  }
};
```

**UI设计:**

完成任务Modal:
```
┌─────────────────────────────────────┐
│  🎉 任务已完成!                      │
│                                      │
│  科学常识练习 (15分钟) ✅             │
│  平均分: 85分                        │
│                                      │
│  还有 2 个任务待完成:                │
│  - 逻辑思维 (15分钟)                 │
│  - 英文口语 (20分钟)                 │
│                                      │
│  [继续下一个]  [稍后再练]            │
└─────────────────────────────────────┘
```

全部完成庆祝:
```
┌─────────────────────────────────────┐
│         🎊 今日任务全部完成!         │
│                                      │
│       你太棒了!坚持就是胜利!          │
│                                      │
│   共完成 5 个任务,练习时长 75 分钟    │
│                                      │
│  [查看反馈报告]  [返回首页]          │
└─────────────────────────────────────┘
```

**原因:**
- 提供连贯的练习体验
- 鼓励用户完成计划任务
- 增加成就感和激励

## Risks / Trade-offs

### 风险1: 用户可能被"计划"束缚,感觉失去自由

**缓解措施:**
- 保留"自由练习"入口,始终可见
- 允许"跳过任务"(标记为完成但不练习)
- 计划不是强制的,无计划时系统正常工作

### 风险2: 任务和会话关联可能出现不一致

**场景**: 用户创建了会话但未完成,又重新创建了新会话
**缓解措施:**
- 每个任务只允许关联一个"活跃"会话(status='in_progress')
- 创建新会话前,检查是否有未完成的会话,提示用户选择"继续"或"重新开始"
- 提供"放弃会话"功能,解除任务关联

### 风险3: 任务题目数量可能与可用题库不匹配

**场景**: 任务要求10道科学常识题,但题库只有5道
**缓解措施:**
- 创建任务时,检查题库可用题目数量
- 如果不足,调用AI生成补充题目
- 用户启动任务时,再次检查并提示题目不足的情况

### Trade-off: 简单关联 vs 复杂状态机

**选择**: 使用简单的三状态模型(pending/in_progress/completed)
**原因**: 
- MVP阶段不需要复杂的状态管理
- 三状态已足够覆盖核心场景
- 未来可扩展(如添加'skipped', 'failed'等状态)

**未来扩展**: 
- 任务依赖关系(必须完成任务A才能开始任务B)
- 任务重做(completed状态可回退到pending)
- 部分完成(做了一半暂停,下次继续)

## Migration Plan

### 数据库迁移

**步骤1: 添加索引(安全,不影响现有数据)**
```sql
CREATE INDEX IF NOT EXISTS idx_sessions_task_id ON sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_status_date ON daily_tasks(status, task_date);
```

**步骤2: 验证外键约束**
```sql
-- 检查是否已存在外键约束
SELECT * FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_NAME = 'sessions' AND COLUMN_NAME = 'task_id';

-- 如果不存在,添加外键约束
ALTER TABLE sessions 
  ADD CONSTRAINT fk_sessions_task_id 
  FOREIGN KEY (task_id) REFERENCES daily_tasks(id) 
  ON DELETE SET NULL;
```

**步骤3: 数据一致性检查**
```sql
-- 检查是否有无效的task_id引用
SELECT COUNT(*) FROM sessions 
WHERE task_id IS NOT NULL AND task_id NOT IN (SELECT id FROM daily_tasks);
```

### 前后端部署

**阶段1: 后端API更新(向后兼容)**
- 添加新API: `GET /api/plans/pending-tasks`, `POST /api/plans/tasks/:id/start-practice`
- 修改现有API: `PATCH /api/sessions/:id/complete` 增加任务状态同步逻辑
- 保持现有API不变,确保旧版前端仍可使用

**阶段2: 前端功能增强**
- 部署新版Dashboard和训练计划页面
- 部署新版练习页面(支持taskId参数)
- 保留原有"自由练习"流程

**阶段3: 测试和验证**
- 手动测试完整流程
- 监控API错误率和响应时间
- 收集用户反馈

**回滚计划:**
- 如果发现严重问题,可以回滚前端代码,后端API仍保持兼容
- 数据库迁移是安全的(仅添加索引和约束),无需回滚

## Open Questions

1. **如果用户在任务到期后才完成练习,应该如何处理?**
   - 方案A: 仍然标记为完成,但在统计中标记为"延迟完成"
   - 方案B: 不允许完成过期任务,只能进行"自由练习"
   - **推荐**: 方案A,更灵活,符合实际使用场景

2. **任务的"跳过"功能应该如何实现?**
   - 方案A: 标记为'completed',但添加`skipped=true`标记
   - 方案B: 新增'skipped'状态
   - **推荐**: 方案A,简单且不改变状态枚举

3. **如果用户中途放弃练习(未完成会话),任务状态应该如何?**
   - 方案A: 保持'in_progress',允许后续恢复
   - 方案B: 提供"放弃会话"按钮,回退到'pending'
   - **推荐**: 方案A,并在下次进入时提示"继续未完成的会话"

4. **是否需要限制每个任务只能创建一个会话?**
   - 方案A: 允许多次创建,但只有最新的会话关联到任务
   - 方案B: 严格限制,必须完成或放弃当前会话才能创建新会话
   - **推荐**: 方案B,避免数据混乱,提供明确的用户引导
