# Design: 計劃和練習聯動

## Context

当前係統中,訓練計劃生成器會創建每日任務(`daily_tasks`表),但这些任務与練習會話(`sessions`表)没有实质性的聯動。用户創建計劃後,仍需要手動選擇類別進行練習,无法体验到計劃的指導價值。

**现有數據模型:**
- `training_plans`: 訓練計劃主表
- `daily_tasks`: 每日任務表,包含`plan_id`, `category`, `duration`, `status`等字段
- `sessions`: 練習會話表,包含可選的`task_id`外键,但当前未强制使用

**用户痛點:**
1. 創建計劃後,不知道应该做什么
2. 練習時需要重复選擇類別和題目數量
3. 計劃的完成進度与实际練習不同步
4. 无法追踪"按計劃練習"vs"自由練習"的數據

## Goals / Non-Goals

**Goals:**
- 将計劃和練習连接起來,形成闭环用户体验
- 用户可以一键從計劃任務進入練習
- 完成練習後自動更新任務狀態
- 保留灵活性,允许自由練習
- 提供清晰的任務進度可视化

**Non-Goals:**
- 不强制用户必须按計劃練習(仍支持自由模式)
- 不改变现有的題目生成和反馈邏輯
- 不引入复杂的任務依赖關係(如必须完成任務A才能開始任務B)
- 不做实時协作或多用户任務分配

## Decisions

### 1. 任務驱動的練習入口

**决策**: 在Dashboard和訓練計劃页面,为每个未完成任務提供"開始練習"按钮

**实现方式:**

**Dashboard 今日任務卡片:**
```
┌─────────────────────────────────────┐
│  📅 今日任務 (3个待完成)            │
├─────────────────────────────────────┤
│  ✅ 英文口語 (20分鐘)  [已完成]     │
│  ⏳ 科學常識 (15分鐘)  [開始練習]   │
│  ⏳ 邏輯思維 (15分鐘)  [開始練習]   │
└─────────────────────────────────────┘
```

**訓練計劃详情页日历视图:**
```
2026-01-25 (今日)
├─ 英文口語 (20分鐘) ✅ 已完成
├─ 科學常識 (15分鐘) [開始] [跳過]
└─ 邏輯思維 (15分鐘) [開始] [跳過]
```

**API设計:**
```typescript
// 获取未完成任務
GET /api/plans/pending-tasks?date=2026-01-25
Response: {
  tasks: [
    {
      id: 123,
      plan_id: 45,
      category: 'science-knowledge',
      duration: 15,
      status: 'pending',
      plan_name: 'SPCC冲刺計劃',
      target_school: 'SPCC'
    }
  ]
}

// 從任務創建會話
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
- 一键启動,减少操作步骤
- 任務信息自動傳递到練習页面,无需用户重复選擇

### 2. 會話-任務自動關聯和狀態同步

**决策**: 從任務創建的會話自動關聯`task_id`,完成會話時自動標記任務完成

**实现流程:**

```
用户點击"開始練習"
  ↓
前端: navigate(/practice?taskId=123)
  ↓
前端: 检测到taskId參數,調用 POST /api/plans/tasks/123/start-practice
  ↓
後端: 創建會話,设置 task_id=123,從任務的category選擇題目
  ↓
返回: session_id + questions + task_info
  ↓
前端: 显示練習界面 + 任務信息横幅
  ↓
用户完成練習
  ↓
前端: 調用 PATCH /api/sessions/:id/complete
  ↓
後端: 
  1. 更新 sessions.status='completed'
  2. 如果 sessions.task_id 存在,更新 daily_tasks.status='completed'
  3. 返回成功
  ↓
前端: 显示"任務已完成"提示 + 检查是否有下一个任務
```

**數據庫变更:**
```sql
-- 確保外键约束存在
ALTER TABLE sessions 
  ADD CONSTRAINT fk_sessions_task_id 
  FOREIGN KEY (task_id) REFERENCES daily_tasks(id) 
  ON DELETE SET NULL;

-- 添加索引優化查询
CREATE INDEX idx_sessions_task_id ON sessions(task_id);
CREATE INDEX idx_daily_tasks_status_date ON daily_tasks(status, task_date);
```

**後端邏輯更新:**
```typescript
// routes/sessions.ts
router.patch('/:id/complete', async (req, res) => {
  const session = await queryOne('SELECT id, task_id FROM sessions WHERE id = ?', [id]);
  
  // 更新會話狀態
  await execute('UPDATE sessions SET status = ?, end_time = NOW() WHERE id = ?', ['completed', id]);
  
  // 如果關聯了任務,自動標記任務完成
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
- 实现計劃和練習的數據同步
- 减少手動更新任務狀態的操作
- 为進度追踪提供準確數據

### 3. 双模式: 任務練習 vs 自由練習

**决策**: 保留两種練習入口,支持不同使用场景

**入口1: 任務練習 (Task-based Practice)**
- 來源: Dashboard、訓練計劃页面的"開始任務"按钮
- URL: `/practice?taskId=123`
- 行为: 自動加载任務對应的類別和題目,显示任務信息横幅
- 完成後: 自動標記任務完成

**入口2: 自由練習 (Free Practice)**
- 來源: 侧边栏"練習"菜单、練習页面的"自由練習"按钮
- URL: `/practice`(无taskId參數)
- 行为: 用户手動選擇類別、題目數量,不關聯任務
- 完成後: 仅保存會話記錄,不影响任務狀態

**前端实现:**
```typescript
// Practice/index.tsx
const Practice = () => {
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');
  const [practiceMode, setPracticeMode] = useState<'task' | 'free'>(taskId ? 'task' : 'free');
  
  useEffect(() => {
    if (taskId) {
      // 任務模式: 自動加载任務信息
      loadTaskAndStartPractice(taskId);
    } else {
      // 自由模式: 显示選擇界面
      setStep('select');
    }
  }, [taskId]);
  
  // ...
}
```

**UI设計:**

任務模式顶部横幅:
```
┌─────────────────────────────────────────────────────────┐
│ 📋 任務練習: SPCC冲刺計劃 > 2026-01-25 > 科學常識 (15分鐘) │
│ 進度: 3/10 題                                            │
└─────────────────────────────────────────────────────────┘
```

自由模式選擇界面:
```
┌─────────────────────────────────────┐
│  🎯 選擇專項類別                     │
│  [英文口語] [中文表達] [邏輯思維]...  │
│                                      │
│  題目數量: 10                        │
│  [開始自由練習]                      │
└─────────────────────────────────────┘
```

**原因:**
- 满足不同需求场景(計劃驱動 vs 随机練習)
- 不强制用户必须創建計劃才能練習
- 保持係統灵活性,避免過度约束

### 4. 任務狀態流转和可视化

**决策**: 明確任務的三種狀態,并在UI中清晰展示

**狀態定义:**
```typescript
type TaskStatus = 'pending' | 'in_progress' | 'completed';

- pending: 未開始,显示"開始練習"按钮
- in_progress: 已創建會話但未完成,显示"继续練習"按钮
- completed: 已完成,显示"✅ 已完成"標記
```

**狀態转换:**
```
pending --[創建會話]--> in_progress --[完成會話]--> completed
            ↓                              ↑
        [關聯session_id]              [自動更新]
```

**实现细节:**
```sql
-- 修改daily_tasks表,添加關聯會話字段(可選)
ALTER TABLE daily_tasks ADD COLUMN session_id INT DEFAULT NULL;
ALTER TABLE daily_tasks ADD CONSTRAINT fk_task_session 
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL;
```

**API支持:**
```typescript
// 获取任務详情,包含關聯會話信息
GET /api/plans/tasks/:taskId
Response: {
  task: {
    id: 123,
    status: 'in_progress',
    session_id: 789,  // 如果存在未完成的會話
    session_progress: { answered: 3, total: 10 }
  }
}
```

**UI展示:**
```
Dashboard 任務卡片:
- pending: 🔵 [開始練習]
- in_progress: 🟡 [继续練習] (進度: 3/10)
- completed: ✅ 已完成
```

**原因:**
- 清晰的狀態流转,用户知道当前進度
- 支持暫停和恢复練習
- 为後续"任務恢复"功能打下基础

### 5. 任務完成後的流程引導

**决策**: 完成一个任務後,智能提示下一步操作

**完成後邏輯:**
```typescript
// 前端: 完成會話後
const onCompleteSession = async () => {
  await api.sessions.complete(sessionId);
  
  // 检查是否还有今日未完成任務
  const pendingTasks = await api.plans.getPendingTasks({ date: today });
  
  if (pendingTasks.length > 0) {
    // 显示Modal: "任務已完成!是否继续下一个任務?"
    Modal.confirm({
      title: '🎉 任務已完成!',
      content: `还有 ${pendingTasks.length} 个任務待完成,是否继续?`,
      okText: '继续下一个',
      cancelText: '稍後再練',
      onOk: () => navigate(`/practice?taskId=${pendingTasks[0].id}`),
      onCancel: () => navigate('/dashboard'),
    });
  } else {
    // 显示庆祝動画: "🎊 今日任務全部完成!"
    showSuccessAnimation();
    setTimeout(() => navigate('/dashboard'), 2000);
  }
};
```

**UI设計:**

完成任務Modal:
```
┌─────────────────────────────────────┐
│  🎉 任務已完成!                      │
│                                      │
│  科學常識練習 (15分鐘) ✅             │
│  平均分: 85分                        │
│                                      │
│  还有 2 个任務待完成:                │
│  - 邏輯思維 (15分鐘)                 │
│  - 英文口語 (20分鐘)                 │
│                                      │
│  [继续下一个]  [稍後再練]            │
└─────────────────────────────────────┘
```

全部完成庆祝:
```
┌─────────────────────────────────────┐
│         🎊 今日任務全部完成!         │
│                                      │
│       你太棒了!坚持就是胜利!          │
│                                      │
│   共完成 5 个任務,練習時長 75 分鐘    │
│                                      │
│  [查看反馈报告]  [返回首页]          │
└─────────────────────────────────────┘
```

**原因:**
- 提供连贯的練習体验
- 鼓励用户完成計劃任務
- 增加成就感和激励

## Risks / Trade-offs

### 風险1: 用户可能被"計劃"束缚,感觉失去自由

**缓解措施:**
- 保留"自由練習"入口,始终可见
- 允许"跳過任務"(標記为完成但不練習)
- 計劃不是强制的,无計劃時係統正常工作

### 風险2: 任務和會話關聯可能出现不一致

**场景**: 用户創建了會話但未完成,又重新創建了新會話
**缓解措施:**
- 每个任務只允许關聯一个"活跃"會話(status='in_progress')
- 創建新會話前,检查是否有未完成的會話,提示用户選擇"继续"或"重新開始"
- 提供"放弃會話"功能,解除任務關聯

### 風险3: 任務題目數量可能与可用題庫不匹配

**场景**: 任務要求10道科學常識題,但題庫只有5道
**缓解措施:**
- 創建任務時,检查題庫可用題目數量
- 如果不足,調用AI生成补充題目
- 用户启動任務時,再次检查并提示題目不足的情况

### Trade-off: 简单關聯 vs 复杂狀態机

**選擇**: 使用简单的三狀態模型(pending/in_progress/completed)
**原因**: 
- MVP阶段不需要复杂的狀態管理
- 三狀態已足够覆盖核心场景
- 未來可扩展(如添加'skipped', 'failed'等狀態)

**未來扩展**: 
- 任務依赖關係(必须完成任務A才能開始任務B)
- 任務重做(completed狀態可回退到pending)
- 部分完成(做了一半暫停,下次继续)

## Migration Plan

### 數據庫迁移

**步骤1: 添加索引(安全,不影响现有數據)**
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

**步骤3: 數據一致性检查**
```sql
-- 检查是否有无效的task_id引用
SELECT COUNT(*) FROM sessions 
WHERE task_id IS NOT NULL AND task_id NOT IN (SELECT id FROM daily_tasks);
```

### 前後端部署

**阶段1: 後端API更新(向後兼容)**
- 添加新API: `GET /api/plans/pending-tasks`, `POST /api/plans/tasks/:id/start-practice`
- 修改现有API: `PATCH /api/sessions/:id/complete` 增加任務狀態同步邏輯
- 保持现有API不变,確保舊版前端仍可使用

**阶段2: 前端功能增强**
- 部署新版Dashboard和訓練計劃页面
- 部署新版練習页面(支持taskId參數)
- 保留原有"自由練習"流程

**阶段3: 测試和验证**
- 手動测試完整流程
- 监控API错误率和响应時間
- 收集用户反馈

**回滚計劃:**
- 如果發现嚴重問題,可以回滚前端代碼,後端API仍保持兼容
- 數據庫迁移是安全的(仅添加索引和约束),无需回滚

## Implementation Notes

### 实际实现中的發现

1. **任務狀態同步時机**
   - 实现: 在會話完成API中同步更新任務狀態,確保原子性
   - 優化: 添加了`task_completed`字段在响应中,前端可據此判断是否显示任務完成提示

2. **題目數量处理**
   - 实现: 從任務的`category`自動選擇題目,數量由後端根據任務`duration`估算
   - 注意: 如果題庫題目不足,會返回错误提示,但未实现"使用现有題目"的降级方案

3. **任務信息傳递**
   - 实现: 通過URL參數`taskId`傳递,前端自動检测并進入任務模式
   - 優化: 任務信息横幅显示計劃名称、日期、類別、進度,提升用户上下文感知

4. **完成後的引導流程**
   - 实现: 完成會話後检查剩余待办任務,显示Modal引導继续或返回
   - 体验: 全部完成時显示庆祝動画,增强成就感

### 已知限制和改進方向

1. **任務恢复功能未实现**
   - 当前: 如果用户中途退出,任務保持`in_progress`狀態,但无法直接恢复
   - 改進: 需要实现"继续未完成會話"功能,检测并恢复之前的會話

2. **跳過任務功能未实现**
   - 当前: 任務只能通過完成練習來標記完成
   - 改進: 添加"跳過"按钮,允许用户直接標記完成而不練習

3. **統計數據区分**
   - 当前: Dashboard統計未区分"計劃內練習"和"自由練習"
   - 改進: 分別統計两種模式的練習次數、時長、平均分等

4. **任務历史追踪**
   - 当前: 只能查看当前計劃的任務,无法查看历史完成記錄
   - 改進: 添加任務历史页面,支持查看過往完成的任務和統計

## Open Questions

1. **如果用户在任務到期後才完成練習,应该如何处理?**
   - 方案A: 仍然標記为完成,但在統計中標記为"延迟完成"
   - 方案B: 不允许完成過期任務,只能進行"自由練習"
   - **当前决策**: 方案A,更灵活,符合实际使用场景
   - **狀態**: 已实现,任務完成不受日期限制

2. **任務的"跳過"功能应该如何实现?**
   - 方案A: 標記为'completed',但添加`skipped=true`標記(存储在metadata JSON字段)
   - 方案B: 新增'skipped'狀態
   - **当前决策**: 方案A,简单且不改变狀態枚举
   - **狀態**: 待实现,已規劃在tasks.md中

3. **如果用户中途放弃練習(未完成會話),任務狀態应该如何?**
   - 方案A: 保持'in_progress',允许後续恢复
   - 方案B: 提供"放弃會話"按钮,回退到'pending'
   - **当前决策**: 方案A,并在下次進入時提示"继续未完成的會話"
   - **狀態**: 部分实现(狀態保持),恢复功能待实现

4. **是否需要限制每个任務只能創建一个會話?**
   - 方案A: 允许多次創建,但只有最新的會話關聯到任務
   - 方案B: 嚴格限制,必须完成或放弃当前會話才能創建新會話
   - **当前决策**: 方案B,避免數據混乱,提供明確的用户引導
   - **狀態**: 已实现,創建新會話前检查是否有未完成的會話

5. **任務恢复功能的实现方式?**
   - 方案A: 在任務卡片显示"继续練習"按钮,直接恢复之前的會話
   - 方案B: 在練習页面检测到未完成會話時,自動提示恢复
   - **推荐**: 方案A+B結合,提供多種恢复入口
   - **狀態**: 待实现
