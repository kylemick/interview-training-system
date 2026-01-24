# Design: 升中面试训练系统

## Context

这是一个全新的项目，为香港小学生提供升中面试训练。系统需要满足：
- 用户主要是小学生（10-12岁），界面需简洁易用
- 本地运行，保护学生隐私和练习数据
- 支持离线使用，但需要网络连接AI API获取反馈
- 轻量级部署，家长可轻松在家中设备上安装

**约束**：
- 预算有限，优先使用免费或低成本方案
- 开发资源有限，优先MVP功能
- 需要快速迭代，根据使用反馈调整

## Goals / Non-Goals

**Goals:**
- 提供六大类面试内容的系统化训练
- AI自动生成和调整训练计划
- 即时反馈和弱点分析
- 针对TOP学校的定制化训练
- 简单易用的本地应用

**Non-Goals:**
- 不做实时语音识别和评分（MVP阶段）
- 不做多人协作或在线社区功能
- 不做视频录制和分析（MVP阶段）
- 不做付费订阅系统

## Decisions

### 1. 架构模式：本地Web应用

**决策**: 采用本地Web应用架构，前后端分离

**原因**:
- 用户友好：小学生使用浏览器更直观，无需学习命令行
- 界面丰富：可以提供图表、卡片、动画等现代UI元素
- 易于部署：一键启动本地服务器，在浏览器打开即可使用
- 数据隐私：所有数据仍在本地，Web服务仅监听localhost

**实现**:
```
┌─────────────────────────────────────┐
│       浏览器 (localhost:3000)       │
│  - 仪表盘 (Dashboard)                │
│  - 练习界面 (Practice)               │
│  - 反馈查看 (Feedback)               │
│  - 进度报告 (Progress)               │
│  - 设置页面 (Settings)               │
└──────────────┬──────────────────────┘
               │ HTTP/WebSocket
┌──────────────┴──────────────────────┐
│         本地Web服务器                │
│  - API路由 (REST/GraphQL)            │
│  - 业务逻辑处理                      │
│  - AI集成服务                        │
└──────────────┬──────────────────────┘
               │
               ├─> 本地数据层 (MySQL)
               │   - plans/
               │   - questions/
               │   - sessions/
               │   - feedback/
               │   - schools/
               │
               └─> DeepSeek API
                   - 计划生成
                   - 题目生成
                   - 反馈分析
```

**替代方案**:
- 纯桌面应用（Electron）：打包体积大，开发成本高
- 云端Web应用：需要服务器，隐私和成本问题

### 2. 数据模型：基于会话(Session)的设计

**决策**: 以"训练会话"为核心组织数据

**数据结构**:
```
训练计划(TrainingPlan)
  ├─ 计划元数据(目标学校、开始日期、总时长)
  ├─ 每日任务(DailyTask[])
  │   └─ 专项类别、题目数量、完成状态
  └─ 调整历史(Adjustment[])

训练会话(Session)
  ├─ 会话元数据(日期、时长、专项类别)
  ├─ 问答记录(QA[])
  │   ├─ 问题
  │   ├─ 学生回答
  │   └─ AI评分
  └─ 会话总结(Summary)
      ├─ 整体表现
      ├─ 弱点分析
      └─ 改进建议

题库(QuestionBank)
  ├─ 专项类别
  ├─ 难度等级
  ├─ 学校标签
  └─ 题目内容

学校特征(SchoolProfile)
  ├─ 学校名称(SPCC/QC/LSC)
  ├─ 面试形式
  ├─ 重点考查内容
  └─ 评分标准
```

**原因**:
- 清晰的数据边界，便于分析和展示
- 支持回溯历史表现
- 便于AI分析趋势和生成建议

### 3. AI集成：提示工程 + 结构化输出

**决策**: 使用DeepSeek API，通过精心设计的提示词获取结构化输出

**三大AI功能**:

**(1) 计划生成**
```
输入: 
  - 目标学校
  - 当前水平评估
  - 面试日期
  - 每周可用时间
输出: 
  - 每日训练任务（JSON格式）
  - 重点专项和分配比例
  - 里程碑检查点
```

**(2) 题目生成**
```
输入:
  - 专项类别
  - 难度等级
  - 学校特征
  - 历史弱点
输出:
  - 问题列表（JSON格式）
  - 参考答案
  - 评分标准
```

**(3) 反馈分析**
```
输入:
  - 问题
  - 学生回答
  - 历史会话数据
输出:
  - 语言质量评分和建议
  - 内容深度评分和建议
  - 弱点识别
  - 参考答案
  - 针对目标学校的建议
```

**提示词策略**:
- 使用few-shot examples提升质量
- 要求返回JSON格式便于解析
- 包含学校特征知识库作为上下文
- 历史数据作为个性化依据

**替代方案**:
- 训练专用模型：成本高，数据不足
- 使用OpenAI API：成本更高

### 4. 数据存储：MySQL数据库

**决策**: 使用MySQL作为本地数据库

**原因**:
- 零配置，单文件部署
- 支持SQL查询，便于复杂分析
- 性能足够（单用户场景）
- 易于备份和迁移

**Schema设计**:
```sql
-- 训练计划
CREATE TABLE training_plans (
  id TEXT PRIMARY KEY,
  target_school TEXT,
  start_date TEXT,
  interview_date TEXT,
  metadata JSON,
  created_at TIMESTAMP
);

-- 每日任务
CREATE TABLE daily_tasks (
  id TEXT PRIMARY KEY,
  plan_id TEXT,
  date TEXT,
  category TEXT,
  target_count INTEGER,
  completed_count INTEGER,
  status TEXT,
  FOREIGN KEY (plan_id) REFERENCES training_plans(id)
);

-- 训练会话
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  plan_id TEXT,
  task_id TEXT,
  category TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES training_plans(id)
);

-- 问答记录
CREATE TABLE qa_records (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  question_id TEXT,
  question TEXT,
  student_answer TEXT,
  ai_feedback JSON,
  created_at TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- 题库
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  category TEXT,
  difficulty TEXT,
  school_tags JSON,
  question_text TEXT,
  reference_answer TEXT,
  scoring_criteria JSON,
  created_at TIMESTAMP
);

-- 学校特征
CREATE TABLE school_profiles (
  id TEXT PRIMARY KEY,
  school_code TEXT UNIQUE,
  school_name TEXT,
  interview_format JSON,
  focus_areas JSON,
  scoring_standards JSON
);
```

**替代方案**:
- JSON文件：查询能力弱，数据量大时性能差
- PostgreSQL：过度设计，部署复杂

### 5. 用户界面：现代Web应用

**决策**: 提供完整的Web用户界面，本地运行

**技术选型建议**:
- **前端框架**: React + TypeScript（或Vue 3）
- **UI组件库**: Ant Design / Material-UI / shadcn/ui
- **状态管理**: React Context / Zustand / Pinia
- **图表库**: ECharts / Chart.js（进度可视化）
- **后端框架**: Node.js + Express / Fastify 或 Python + FastAPI
- **实时通信**: WebSocket（AI模拟面试时的对话）

**核心页面设计**:

**1. 仪表盘 (Dashboard)**
- 今日任务概览卡片
- 本周进度图表
- 最近会话列表
- 弱点提醒和建议

**2. 训练计划 (Training Plan)**
- 创建计划表单（目标学校、日期、每周时长）
- 日历视图展示每日任务
- 计划调整界面
- 完成度进度条

**3. 练习界面 (Practice)**
- 选择专项类别和模式（文字问答/AI面试）
- 题目展示卡片
- 答案输入区（文本框或富文本编辑器）
- 进度指示器（第X/N题）
- 实时AI对话框（模拟面试模式）

**4. 反馈查看 (Feedback)**
- 会话总结卡片
- 评分雷达图（语言、内容、逻辑等维度）
- 逐题反馈展开列表
- 参考答案对比视图
- 学校针对性建议高亮

**5. 进度报告 (Progress)**
- 时间轴视图（日/周/月）
- 各专项得分趋势折线图
- 练习量热力图
- 弱点追踪面板
- 里程碑成就展示

**6. 设置页面 (Settings)**
- 学生信息设置
- 目标学校选择
- API密钥配置
- 数据导出/备份
- 题库管理（添加、编辑、删除题目）

**7. 面试回忆录入页面 (Interview Memory)**
- 批量录入界面（粘贴文字版面试内容）
- 标注专项类别和学校
- AI自动分析并拆分为题目（可选）
- 可选：直接作为练习记录，获取反馈
- 可选：加入题库供后续练习

**用户体验要点**:
- 响应式设计，支持平板和桌面
- 简洁清晰，减少认知负担
- 即时反馈，操作有提示
- 适龄设计，使用友好的语言和图标
- 支持键盘快捷键（如Enter提交答案）

**原因**:
- Web界面适合小学生，直观易用
- 丰富的可视化帮助理解进度
- 现代UI提升使用意愿
- 浏览器环境无需安装依赖

## Risks / Trade-offs

### 风险1：AI反馈质量不稳定
**缓解措施**:
- 设计详细的提示词模板
- 提供人工审核和调整机制
- 收集反馈数据持续优化提示词
- 允许家长补充备注

### 风险2：DeepSeek API依赖
**缓解措施**:
- 核心功能支持离线使用
- 提供API切换机制（可换用其他LLM）
- 本地缓存AI生成的内容
- 失败重试和错误处理

### 风险3：学校特征数据不准确
**缓解措施**:
- 初始数据基于公开资料和经验
- 支持用户补充和修正
- 社区驱动的知识库更新
- 定期从面试经验收集反馈

### 风险4：学生使用门槛
**缓解措施**:
- 简化初始设置流程
- 提供详细的使用指南
- 设计直观的Web界面
- 提供示例和演示

### Trade-off：本地存储 vs 云同步
**选择**: 本地优先
**原因**: 隐私和简单性优先于便利性
**未来**: 可选的云备份功能

## Migration Plan

不适用（新系统，无迁移需求）

## Open Questions

1. **题库初始数据从哪里来？**
   - 方案：手动输入种子数据（~50题）+ AI扩展生成（~200题）
   - 需要：收集真实面试题目和经验

2. **如何评估AI反馈的准确性？**
   - 方案：A/B测试不同提示词，收集家长和老师反馈
   - 需要：建立评估标准和测试集

3. **是否需要支持多个学生账号？**
   - 方案：MVP阶段支持单学生，数据库设计预留user_id字段
   - 未来：添加用户管理功能

4. **如何处理敏感信息（如学生姓名）？**
   - 方案：本地存储，不上传到AI API
   - 数据发送到API时匿名化处理
