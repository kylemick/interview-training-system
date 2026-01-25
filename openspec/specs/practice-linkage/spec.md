# Practice Linkage Specification

## ADDED Requirements

### Requirement: Task-Based Practice Session Creation

系统SHALL支持从训练计划的每日任务直接创建练习会话,自动关联任务信息并选择对应的题目。

#### Scenario: 用户从Dashboard今日任务启动练习

- **GIVEN** 用户已创建训练计划,存在未完成的今日任务
- **WHEN** 用户在Dashboard点击任务的"开始练习"按钮
- **THEN** 系统应自动创建练习会话,关联该任务ID,并跳转到练习页面
- **AND** 练习页面应显示任务信息横幅(计划名称、日期、类别、进度)
- **AND** 系统应自动从题库中选择该任务类别的题目

#### Scenario: 用户从训练计划页面启动任务

- **GIVEN** 用户查看训练计划详情,看到某日的任务列表
- **WHEN** 用户点击某个任务的"开始"按钮
- **THEN** 系统应创建关联该任务的练习会话
- **AND** 跳转到练习页面并自动加载题目
- **AND** 任务状态应更新为'in_progress'

#### Scenario: 任务题目不足时的处理

- **GIVEN** 某个任务要求10道题目,但题库中该类别只有5道题
- **WHEN** 用户启动该任务
- **THEN** 系统应提示用户题目数量不足
- **AND** 提供选项: "使用现有5道题" 或 "取消并生成更多题目"
- **AND** 如果用户选择继续,应创建会话并使用可用的5道题

### Requirement: Automatic Task Status Synchronization

系统SHALL在练习会话完成时,自动更新关联的每日任务状态为已完成。

#### Scenario: 完成关联任务的练习会话

- **GIVEN** 用户正在进行一个关联了任务ID的练习会话
- **WHEN** 用户完成所有题目并提交会话
- **THEN** 系统应将会话状态更新为'completed'
- **AND** 系统应自动将关联的每日任务状态更新为'completed'
- **AND** 任务的`completed_at`字段应设置为当前时间
- **AND** 前端应显示"任务已完成"提示

#### Scenario: 完成自由练习会话(无关联任务)

- **GIVEN** 用户进行自由练习(未关联任务ID)
- **WHEN** 用户完成练习并提交会话
- **THEN** 系统应将会话状态更新为'completed'
- **AND** 不应影响任何每日任务的状态
- **AND** 前端应显示"练习已完成"提示(不提及任务)

#### Scenario: 会话完成失败时的处理

- **GIVEN** 用户完成练习并提交会话
- **WHEN** 会话完成API调用失败(网络错误、服务器错误等)
- **THEN** 系统应保持会话状态为'in_progress'
- **AND** 显示错误提示并允许用户重试
- **AND** 不应更新任务状态

### Requirement: Pending Tasks Retrieval API

系统SHALL提供API接口,用于获取指定日期的未完成任务列表,包含计划和任务的详细信息。

#### Scenario: 获取今日未完成任务

- **GIVEN** 当前日期为2026-01-25,存在活跃的训练计划
- **WHEN** 前端调用 `GET /api/plans/pending-tasks?date=2026-01-25`
- **THEN** 系统应返回该日期所有状态为'pending'或'in_progress'的任务
- **AND** 每个任务应包含: id, plan_id, category, duration, status, plan_name, target_school
- **AND** 任务应按创建时间或类别排序

#### Scenario: 获取未完成任务但无活跃计划

- **GIVEN** 用户没有创建任何训练计划
- **WHEN** 前端调用 `GET /api/plans/pending-tasks`
- **THEN** 系统应返回空数组
- **AND** HTTP状态码应为200
- **AND** 前端应显示"暂无训练计划"提示

#### Scenario: 查询历史日期的任务

- **GIVEN** 用户想查看过去某天的任务完成情况
- **WHEN** 前端调用 `GET /api/plans/pending-tasks?date=2026-01-20`
- **THEN** 系统应返回该日期的所有任务(包括已完成的)
- **AND** 可通过`status`参数过滤: `?date=2026-01-20&status=completed`

### Requirement: Task Practice Initiation API

系统SHALL提供专用API,用于从任务ID创建练习会话并返回题目列表。

#### Scenario: 从任务创建练习会话成功

- **GIVEN** 存在任务ID=123,类别为'science-knowledge',该类别题库有足够题目
- **WHEN** 前端调用 `POST /api/plans/tasks/123/start-practice`
- **THEN** 系统应创建新的练习会话,设置`task_id=123`
- **AND** 从题库中随机选择该类别的题目(数量可配置,默认10道)
- **AND** 返回会话ID、题目列表、任务信息
- **AND** 任务状态应更新为'in_progress'

#### Scenario: 任务已有未完成的会话

- **GIVEN** 任务ID=123已关联一个未完成的会话(status='in_progress')
- **WHEN** 用户尝试再次启动该任务
- **THEN** 系统应返回错误提示: "该任务已有进行中的会话"
- **AND** 提示用户选择: "继续现有会话" 或 "放弃并重新开始"
- **AND** HTTP状态码应为409 (Conflict)

#### Scenario: 任务不存在

- **GIVEN** 用户请求的任务ID不存在
- **WHEN** 前端调用 `POST /api/plans/tasks/999/start-practice`
- **THEN** 系统应返回404错误
- **AND** 错误消息应为"任务不存在"

### Requirement: Dual Practice Mode Support

系统SHALL同时支持"任务练习"和"自由练习"两种模式,用户可自由选择。

#### Scenario: 任务模式练习

- **GIVEN** 用户通过Dashboard或训练计划页面进入练习
- **WHEN** URL包含`taskId`参数(如`/practice?taskId=123`)
- **THEN** 系统应进入"任务模式"
- **AND** 自动加载任务信息并开始练习,无需用户选择类别
- **AND** 显示任务信息横幅
- **AND** 完成后自动更新任务状态

#### Scenario: 自由模式练习

- **GIVEN** 用户通过侧边栏"练习"菜单或练习页面的"自由练习"按钮进入
- **WHEN** URL不包含`taskId`参数(如`/practice`)
- **THEN** 系统应进入"自由模式"
- **AND** 显示类别选择和题目数量设置界面
- **AND** 用户手动选择后创建会话,不关联任务ID
- **AND** 完成后不影响任何任务状态

#### Scenario: 用户在任务模式中切换到自由模式

- **GIVEN** 用户正在进行任务模式练习
- **WHEN** 用户点击"切换到自由练习"按钮
- **THEN** 系统应提示"当前会话将被保存,是否确认切换?"
- **AND** 确认后,跳转到自由练习选择界面
- **AND** 当前任务会话保持'in_progress'状态,可稍后恢复

### Requirement: Task Completion Flow Guidance

系统SHALL在用户完成一个任务后,智能提示下一步操作,引导连续完成多个任务。

#### Scenario: 完成任务且还有待办任务

- **GIVEN** 用户完成了一个任务,今日还有2个待办任务
- **WHEN** 会话完成后
- **THEN** 系统应显示Modal: "任务已完成!还有2个任务待完成,是否继续?"
- **AND** 提供两个按钮: "继续下一个" 和 "稍后再练"
- **AND** 点击"继续下一个"应跳转到下一个任务的练习页面
- **AND** 点击"稍后再练"应返回Dashboard

#### Scenario: 完成最后一个任务

- **GIVEN** 用户完成了今日最后一个任务
- **WHEN** 会话完成后
- **THEN** 系统应显示庆祝动画和消息: "🎊 今日任务全部完成!"
- **AND** 显示今日统计: 完成任务数、总练习时长、平均分数
- **AND** 提供按钮: "查看反馈报告" 和 "返回首页"
- **AND** 2秒后自动跳转到Dashboard

#### Scenario: 完成自由练习(无后续任务提示)

- **GIVEN** 用户完成了自由练习(未关联任务)
- **WHEN** 会话完成后
- **THEN** 系统应显示"练习已完成"提示
- **AND** 不应提示"继续下一个任务"
- **AND** 提供按钮: "查看反馈" 和 "返回首页"

### Requirement: Task Information Display in Practice UI

系统SHALL在练习页面顶部显示任务信息横幅,帮助用户明确当前练习的上下文。

#### Scenario: 任务模式下显示任务横幅

- **GIVEN** 用户正在进行任务模式练习
- **WHEN** 练习页面加载完成
- **THEN** 页面顶部应显示任务信息横幅,包含:
  - 计划名称(如"SPCC冲刺计划")
  - 任务日期(如"2026-01-25")
  - 类别(如"科学常识")
  - 预计时长(如"15分钟")
  - 当前进度(如"3/10 题")
- **AND** 横幅应使用醒目的颜色和图标
- **AND** 提供"放弃任务"按钮(可选)

#### Scenario: 自由模式下不显示任务横幅

- **GIVEN** 用户正在进行自由练习
- **WHEN** 练习页面加载完成
- **THEN** 不应显示任务信息横幅
- **AND** 仅显示类别和进度信息
- **AND** 不提供"放弃任务"按钮

### Requirement: Task Badge and Notification

系统SHALL在Dashboard和导航栏显示未完成任务数量徽章,提醒用户待办事项。

#### Scenario: Dashboard显示今日任务统计

- **GIVEN** 今日有5个任务,其中3个已完成,2个待办
- **WHEN** 用户访问Dashboard
- **THEN** "今日任务"卡片应显示:
  - 标题: "📅 今日任务 (2个待完成)"
  - 已完成任务列表(折叠或展示前3个)
  - 待办任务列表,每个带"开始练习"按钮
  - 进度条: 3/5 (60%)
- **AND** 卡片应使用醒目的颜色突出显示待办任务

#### Scenario: 导航栏显示任务徽章

- **GIVEN** 今日有2个未完成任务
- **WHEN** 用户浏览任何页面
- **THEN** 侧边栏"训练计划"菜单项应显示红色徽章: (2)
- **AND** 点击菜单项后,徽章应跳转到计划详情页

#### Scenario: 所有任务完成后徽章消失

- **GIVEN** 用户完成了今日所有任务
- **WHEN** 最后一个任务完成
- **THEN** 导航栏徽章应消失
- **AND** Dashboard应显示"✅ 今日任务全部完成"

### Requirement: Task Skip Functionality

系统SHALL允许用户跳过任务,直接标记为完成而不进行练习,同时记录跳过标记。

#### Scenario: 用户跳过某个任务

- **GIVEN** 今日有一个"英文口语"任务,用户不想练习
- **WHEN** 用户在任务卡片上点击"跳过"按钮
- **THEN** 系统应弹出确认对话框: "确认跳过此任务?将不计入练习记录。"
- **AND** 确认后,任务状态应更新为'completed'
- **AND** 任务的`completed_at`应设置为当前时间
- **AND** 任务应添加`skipped=true`标记(存储在metadata JSON字段)
- **AND** 前端应显示"任务已跳过"提示

#### Scenario: 跳过的任务在统计中标识

- **GIVEN** 用户跳过了某个任务
- **WHEN** 查看进度报告或任务历史
- **THEN** 该任务应标记为"已跳过",不计入完成统计
- **AND** 进度图表中应区分"完成"和"跳过"
- **AND** 跳过的任务不应影响平均分数计算

#### Scenario: 跳过任务后仍可补练

- **GIVEN** 用户之前跳过了某个任务
- **WHEN** 用户想补做该任务
- **THEN** 应在任务历史中提供"补练"按钮
- **AND** 点击后创建新的练习会话,但不改变原任务的"已跳过"标记
- **AND** 新会话应标记为"补练",单独统计

## MODIFIED Requirements

无

## REMOVED Requirements

无

## RENAMED Requirements

无
