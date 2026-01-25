# Practice Linkage Specification

## ADDED Requirements

### Requirement: Task-Based Practice Session Creation

係統SHALL支持從訓練計劃的每日任務直接創建練習會話,自動關聯任務信息并選擇對应的題目。

#### Scenario: 用户從Dashboard今日任務启動練習

- **GIVEN** 用户已創建訓練計劃,存在未完成的今日任務
- **WHEN** 用户在Dashboard點击任務的"開始練習"按钮
- **THEN** 係統应自動創建練習會話,關聯该任務ID,并跳转到練習页面
- **AND** 練習页面应显示任務信息横幅(計劃名称、日期、類別、進度)
- **AND** 係統应自動從題庫中選擇该任務類別的題目

#### Scenario: 用户從訓練計劃页面启動任務

- **GIVEN** 用户查看訓練計劃详情,看到某日的任務列表
- **WHEN** 用户點击某个任務的"開始"按钮
- **THEN** 係統应創建關聯该任務的練習會話
- **AND** 跳转到練習页面并自動加载題目
- **AND** 任務狀態应更新为'in_progress'

#### Scenario: 任務題目不足時的处理

- **GIVEN** 某个任務要求10道題目,但題庫中该類別只有5道題
- **WHEN** 用户启動该任務
- **THEN** 係統应提示用户題目數量不足
- **AND** 提供選項: "使用现有5道題" 或 "取消并生成更多題目"
- **AND** 如果用户選擇继续,应創建會話并使用可用的5道題

### Requirement: Automatic Task Status Synchronization

係統SHALL在練習會話完成時,自動更新關聯的每日任務狀態为已完成。

#### Scenario: 完成關聯任務的練習會話

- **GIVEN** 用户正在進行一个關聯了任務ID的練習會話
- **WHEN** 用户完成所有題目并提交會話
- **THEN** 係統应将會話狀態更新为'completed'
- **AND** 係統应自動将關聯的每日任務狀態更新为'completed'
- **AND** 任務的`completed_at`字段应设置为当前時間
- **AND** 前端应显示"任務已完成"提示

#### Scenario: 完成自由練習會話(无關聯任務)

- **GIVEN** 用户進行自由練習(未關聯任務ID)
- **WHEN** 用户完成練習并提交會話
- **THEN** 係統应将會話狀態更新为'completed'
- **AND** 不应影响任何每日任務的狀態
- **AND** 前端应显示"練習已完成"提示(不提及任務)

#### Scenario: 會話完成失敗時的处理

- **GIVEN** 用户完成練習并提交會話
- **WHEN** 會話完成API調用失敗(网络错误、服務器错误等)
- **THEN** 係統应保持會話狀態为'in_progress'
- **AND** 显示错误提示并允许用户重試
- **AND** 不应更新任務狀態

### Requirement: Pending Tasks Retrieval API

係統SHALL提供API接口,用于获取指定日期的未完成任務列表,包含計劃和任務的详细信息。

#### Scenario: 获取今日未完成任務

- **GIVEN** 当前日期为2026-01-25,存在活跃的訓練計劃
- **WHEN** 前端調用 `GET /api/plans/pending-tasks?date=2026-01-25`
- **THEN** 係統应返回该日期所有狀態为'pending'或'in_progress'的任務
- **AND** 每个任務应包含: id, plan_id, category, duration, status, plan_name, target_school
- **AND** 任務应按創建時間或類別排序

#### Scenario: 获取未完成任務但无活跃計劃

- **GIVEN** 用户没有創建任何訓練計劃
- **WHEN** 前端調用 `GET /api/plans/pending-tasks`
- **THEN** 係統应返回空數組
- **AND** HTTP狀態碼应为200
- **AND** 前端应显示"暫无訓練計劃"提示

#### Scenario: 查询历史日期的任務

- **GIVEN** 用户想查看過去某天的任務完成情况
- **WHEN** 前端調用 `GET /api/plans/pending-tasks?date=2026-01-20`
- **THEN** 係統应返回该日期的所有任務(包括已完成的)
- **AND** 可通過`status`參數過滤: `?date=2026-01-20&status=completed`

### Requirement: Task Practice Initiation API

係統SHALL提供專用API,用于從任務ID創建練習會話并返回題目列表。

#### Scenario: 從任務創建練習會話成功

- **GIVEN** 存在任務ID=123,類別为'science-knowledge',该類別題庫有足够題目
- **WHEN** 前端調用 `POST /api/plans/tasks/123/start-practice`
- **THEN** 係統应創建新的練習會話,设置`task_id=123`
- **AND** 從題庫中随机選擇该類別的題目(數量可配置,默认10道)
- **AND** 返回會話ID、題目列表、任務信息
- **AND** 任務狀態应更新为'in_progress'

#### Scenario: 任務已有未完成的會話

- **GIVEN** 任務ID=123已關聯一个未完成的會話(status='in_progress')
- **WHEN** 用户尝試再次启動该任務
- **THEN** 係統应返回错误提示: "该任務已有進行中的會話"
- **AND** 提示用户選擇: "继续现有會話" 或 "放弃并重新開始"
- **AND** HTTP狀態碼应为409 (Conflict)

#### Scenario: 任務不存在

- **GIVEN** 用户请求的任務ID不存在
- **WHEN** 前端調用 `POST /api/plans/tasks/999/start-practice`
- **THEN** 係統应返回404错误
- **AND** 错误消息应为"任務不存在"

### Requirement: Dual Practice Mode Support

係統SHALL同時支持"任務練習"和"自由練習"两種模式,用户可自由選擇。

#### Scenario: 任務模式練習

- **GIVEN** 用户通過Dashboard或訓練計劃页面進入練習
- **WHEN** URL包含`taskId`參數(如`/practice?taskId=123`)
- **THEN** 係統应進入"任務模式"
- **AND** 自動加载任務信息并開始練習,无需用户選擇類別
- **AND** 显示任務信息横幅
- **AND** 完成後自動更新任務狀態

#### Scenario: 自由模式練習

- **GIVEN** 用户通過侧边栏"練習"菜单或練習页面的"自由練習"按钮進入
- **WHEN** URL不包含`taskId`參數(如`/practice`)
- **THEN** 係統应進入"自由模式"
- **AND** 显示類別選擇和題目數量设置界面
- **AND** 用户手動選擇後創建會話,不關聯任務ID
- **AND** 完成後不影响任何任務狀態

#### Scenario: 用户在任務模式中切换到自由模式

- **GIVEN** 用户正在進行任務模式練習
- **WHEN** 用户點击"切换到自由練習"按钮
- **THEN** 係統应提示"当前會話将被保存,是否確认切换?"
- **AND** 確认後,跳转到自由練習選擇界面
- **AND** 当前任務會話保持'in_progress'狀態,可稍後恢复

### Requirement: Task Completion Flow Guidance

係統SHALL在用户完成一个任務後,智能提示下一步操作,引導连续完成多个任務。

#### Scenario: 完成任務且还有待办任務

- **GIVEN** 用户完成了一个任務,今日还有2个待办任務
- **WHEN** 會話完成後
- **THEN** 係統应显示Modal: "任務已完成!还有2个任務待完成,是否继续?"
- **AND** 提供两个按钮: "继续下一个" 和 "稍後再練"
- **AND** 點击"继续下一个"应跳转到下一个任務的練習页面
- **AND** 點击"稍後再練"应返回Dashboard

#### Scenario: 完成最後一个任務

- **GIVEN** 用户完成了今日最後一个任務
- **WHEN** 會話完成後
- **THEN** 係統应显示庆祝動画和消息: "🎊 今日任務全部完成!"
- **AND** 显示今日統計: 完成任務數、總練習時長、平均分數
- **AND** 提供按钮: "查看反馈报告" 和 "返回首页"
- **AND** 2秒後自動跳转到Dashboard

#### Scenario: 完成自由練習(无後续任務提示)

- **GIVEN** 用户完成了自由練習(未關聯任務)
- **WHEN** 會話完成後
- **THEN** 係統应显示"練習已完成"提示
- **AND** 不应提示"继续下一个任務"
- **AND** 提供按钮: "查看反馈" 和 "返回首页"

### Requirement: Task Information Display in Practice UI

係統SHALL在練習页面顶部显示任務信息横幅,帮助用户明確当前練習的上下文。

#### Scenario: 任務模式下显示任務横幅

- **GIVEN** 用户正在進行任務模式練習
- **WHEN** 練習页面加载完成
- **THEN** 页面顶部应显示任務信息横幅,包含:
  - 計劃名称(如"SPCC冲刺計劃")
  - 任務日期(如"2026-01-25")
  - 類別(如"科學常識")
  - 预計時長(如"15分鐘")
  - 当前進度(如"3/10 題")
- **AND** 横幅应使用醒目的颜色和图標
- **AND** 提供"放弃任務"按钮(可選)

#### Scenario: 自由模式下不显示任務横幅

- **GIVEN** 用户正在進行自由練習
- **WHEN** 練習页面加载完成
- **THEN** 不应显示任務信息横幅
- **AND** 仅显示類別和進度信息
- **AND** 不提供"放弃任務"按钮

### Requirement: Task Badge and Notification

係統SHALL在Dashboard和導航栏显示未完成任務數量徽章,提醒用户待办事項。

#### Scenario: Dashboard显示今日任務統計

- **GIVEN** 今日有5个任務,其中3个已完成,2个待办
- **WHEN** 用户访問Dashboard
- **THEN** "今日任務"卡片应显示:
  - 標題: "📅 今日任務 (2个待完成)"
  - 已完成任務列表(折叠或展示前3个)
  - 待办任務列表,每个带"開始練習"按钮
  - 進度条: 3/5 (60%)
- **AND** 卡片应使用醒目的颜色突出显示待办任務

#### Scenario: 導航栏显示任務徽章

- **GIVEN** 今日有2个未完成任務
- **WHEN** 用户浏览任何页面
- **THEN** 侧边栏"訓練計劃"菜单項应显示红色徽章: (2)
- **AND** 點击菜单項後,徽章应跳转到計劃详情页

#### Scenario: 所有任務完成後徽章消失

- **GIVEN** 用户完成了今日所有任務
- **WHEN** 最後一个任務完成
- **THEN** 導航栏徽章应消失
- **AND** Dashboard应显示"✅ 今日任務全部完成"

### Requirement: Task Skip Functionality

係統SHALL允许用户跳過任務,直接標記为完成而不進行練習,同時記錄跳過標記。

#### Scenario: 用户跳過某个任務

- **GIVEN** 今日有一个"英文口語"任務,用户不想練習
- **WHEN** 用户在任務卡片上點击"跳過"按钮
- **THEN** 係統应弹出確认對話框: "確认跳過此任務?将不計入練習記錄。"
- **AND** 確认後,任務狀態应更新为'completed'
- **AND** 任務的`completed_at`应设置为当前時間
- **AND** 任務应添加`skipped=true`標記(存储在metadata JSON字段)
- **AND** 前端应显示"任務已跳過"提示

#### Scenario: 跳過的任務在統計中標識

- **GIVEN** 用户跳過了某个任務
- **WHEN** 查看進度报告或任務历史
- **THEN** 该任務应標記为"已跳過",不計入完成統計
- **AND** 進度图表中应区分"完成"和"跳過"
- **AND** 跳過的任務不应影响平均分數計算

#### Scenario: 跳過任務後仍可补練

- **GIVEN** 用户之前跳過了某个任務
- **WHEN** 用户想补做该任務
- **THEN** 应在任務历史中提供"补練"按钮
- **AND** 點击後創建新的練習會話,但不改变原任務的"已跳過"標記
- **AND** 新會話应標記为"补練",单独統計

## MODIFIED Requirements

无

## REMOVED Requirements

无

## RENAMED Requirements

无
