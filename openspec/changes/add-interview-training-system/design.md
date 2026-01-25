# Design: 升中面試訓練係統

## Context

这是一个全新的項目，为香港小學生提供升中面試訓練。係統需要满足：
- 用户主要是小學生（10-12岁），界面需简洁易用
- 本地运行，保护學生隐私和練習數據
- 支持离线使用，但需要网络连接AI API获取反馈
- 轻量级部署，家長可轻松在家中设備上安装

**约束**：
- 预算有限，優先使用免费或低成本方案
- 開發資源有限，優先MVP功能
- 需要快速迭代，根據使用反馈調整

## Goals / Non-Goals

**Goals:**
- 提供六大類面試內容的係統化訓練
- AI自動生成和調整訓練計劃
- 即時反馈和弱點分析
- 針對TOP學校的定制化訓練
- 简单易用的本地应用

**Non-Goals:**
- 不做实時語音識別和評分（MVP阶段）
- 不做多人协作或在线社区功能
- 不做视频錄制和分析（MVP阶段）
- 不做付费订阅係統

## Decisions

### 1. 架构模式：本地Web应用

**决策**: 采用本地Web应用架构，前後端分离

**原因**:
- 用户友好：小學生使用浏览器更直觀，无需學習命令行
- 界面丰富：可以提供图表、卡片、動画等现代UI元素
- 易于部署：一键启動本地服務器，在浏览器打開即可使用
- 數據隐私：所有數據仍在本地，Web服務仅监听localhost

**实现**:
```
┌─────────────────────────────────────┐
│       浏览器 (localhost:3000)       │
│  - 仪表盘 (Dashboard)                │
│  - 練習界面 (Practice)               │
│  - 反馈查看 (Feedback)               │
│  - 進度报告 (Progress)               │
│  - 设置页面 (Settings)               │
└──────────────┬──────────────────────┘
               │ HTTP/WebSocket
┌──────────────┴──────────────────────┐
│         本地Web服務器                │
│  - API路由 (REST/GraphQL)            │
│  - 业務邏輯处理                      │
│  - AI集成服務                        │
└──────────────┬──────────────────────┘
               │
               ├─> 本地數據层 (MySQL)
               │   - plans/
               │   - questions/
               │   - sessions/
               │   - feedback/
               │   - schools/
               │
               └─> DeepSeek API
                   - 計劃生成
                   - 題目生成
                   - 反馈分析
```

**替代方案**:
- 纯桌面应用（Electron）：打包体积大，開發成本高
- 云端Web应用：需要服務器，隐私和成本問題

### 2. 數據模型：基于會話(Session)的设計

**决策**: 以"訓練會話"为核心組织數據

**數據結构**:
```
訓練計劃(TrainingPlan)
  ├─ 計劃元數據(目標學校、開始日期、總時長)
  ├─ 每日任務(DailyTask[])
  │   └─ 專項類別、題目數量、完成狀態
  └─ 調整历史(Adjustment[])

訓練會話(Session)
  ├─ 會話元數據(日期、時長、專項類別)
  ├─ 問答記錄(QA[])
  │   ├─ 問題
  │   ├─ 學生回答
  │   └─ AI評分
  └─ 會話總結(Summary)
      ├─ 整体表现
      ├─ 弱點分析
      └─ 改進建議

題庫(QuestionBank)
  ├─ 專項類別
  ├─ 難度等级
  ├─ 學校標籤
  └─ 題目內容

學校特征(SchoolProfile)
  ├─ 學校名称(SPCC/QC/LSC)
  ├─ 面試形式
  ├─ 重點考查內容
  └─ 評分標準
```

**原因**:
- 清晰的數據边界，便于分析和展示
- 支持回溯历史表现
- 便于AI分析趋勢和生成建議

### 3. AI集成：提示工程 + 結构化输出

**决策**: 使用DeepSeek API，通過精心设計的提示詞获取結构化输出

**三大AI功能**:

**(1) 計劃生成**
```
输入: 
  - 目標學校
  - 当前水平評估
  - 面試日期
  - 每周可用時間
输出: 
  - 每日訓練任務（JSON格式）
  - 重點專項和分配比例
  - 里程碑检查點
```

**(2) 題目生成**
```
输入:
  - 專項類別
  - 難度等级
  - 學校特征
  - 历史弱點
输出:
  - 問題列表（JSON格式）
  - 參考答案
  - 評分標準
```

**(3) 反馈分析**
```
输入:
  - 問題
  - 學生回答
  - 历史會話數據
输出:
  - 語言质量評分和建議
  - 內容深度評分和建議
  - 弱點識別
  - 參考答案
  - 針對目標學校的建議
```

**提示詞策略**:
- 使用few-shot examples提升质量
- 要求返回JSON格式便于解析
- 包含學校特征知識庫作为上下文
- 历史數據作为个性化依據

**替代方案**:
- 訓練專用模型：成本高，數據不足
- 使用OpenAI API：成本更高

### 4. 數據存储：MySQL數據庫

**决策**: 使用MySQL作为本地數據庫

**原因**:
- 零配置，单文件部署
- 支持SQL查询，便于复杂分析
- 性能足够（单用户场景）
- 易于備份和迁移

**Schema设計**:
```sql
-- 訓練計劃
CREATE TABLE training_plans (
  id TEXT PRIMARY KEY,
  target_school TEXT,
  start_date TEXT,
  interview_date TEXT,
  metadata JSON,
  created_at TIMESTAMP
);

-- 每日任務
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

-- 訓練會話
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  plan_id TEXT,
  task_id TEXT,
  category TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES training_plans(id)
);

-- 問答記錄
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

-- 題庫
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

-- 學校特征
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
- JSON文件：查询能力弱，數據量大時性能差
- PostgreSQL：過度设計，部署复杂

### 5. 用户界面：现代Web应用

**决策**: 提供完整的Web用户界面，本地运行

**技術選型建議**:
- **前端框架**: React + TypeScript（或Vue 3）
- **UI組件庫**: Ant Design / Material-UI / shadcn/ui
- **狀態管理**: React Context / Zustand / Pinia
- **图表庫**: ECharts / Chart.js（進度可视化）
- **後端框架**: Node.js + Express / Fastify 或 Python + FastAPI
- **实時通信**: WebSocket（AI模拟面試時的對話）

**核心页面设計**:

**1. 仪表盘 (Dashboard)**
- 今日任務概览卡片
- 本周進度图表
- 最近會話列表
- 弱點提醒和建議

**2. 訓練計劃 (Training Plan)**
- 創建計劃表单（目標學校、日期、每周時長）
- 日历视图展示每日任務
- 計劃調整界面
- 完成度進度条

**3. 練習界面 (Practice)**
- 選擇專項類別和模式（文字問答/AI面試）
- 題目展示卡片
- 答案输入区（文本框或富文本编輯器）
- 進度指示器（第X/N題）
- 实時AI對話框（模拟面試模式）

**4. 反馈查看 (Feedback)**
- 會話總結卡片
- 評分雷達图（語言、內容、邏輯等維度）
- 逐題反馈展開列表
- 參考答案對比视图
- 學校針對性建議高亮

**5. 進度报告 (Progress)**
- 時間轴视图（日/周/月）
- 各專項得分趋勢折线图
- 練習量热力图
- 弱點追踪面板
- 里程碑成就展示

**6. 设置页面 (Settings)**
- 學生信息设置
- 目標學校選擇
- API密钥配置
- 數據導出/備份
- 題庫管理（添加、编輯、删除題目）

**7. 面試回憶錄入页面 (Interview Memory)**
- 批量錄入界面（粘贴文字版面試內容）
- 標注專項類別和學校
- AI自動分析并拆分为題目（可選）
- 可選：直接作为練習記錄，获取反馈
- 可選：加入題庫供後续練習

**用户体验要點**:
- 响应式设計，支持平板和桌面
- 简洁清晰，减少认知负担
- 即時反馈，操作有提示
- 适龄设計，使用友好的語言和图標
- 支持键盘快捷键（如Enter提交答案）

**原因**:
- Web界面适合小學生，直觀易用
- 丰富的可视化帮助理解進度
- 现代UI提升使用意愿
- 浏览器环境无需安装依赖

## Risks / Trade-offs

### 風险1：AI反馈质量不稳定
**缓解措施**:
- 设計详细的提示詞模板
- 提供人工审核和調整机制
- 收集反馈數據持续優化提示詞
- 允许家長补充備注

### 風险2：DeepSeek API依赖
**缓解措施**:
- 核心功能支持离线使用
- 提供API切换机制（可换用其他LLM）
- 本地缓存AI生成的內容
- 失敗重試和错误处理

### 風险3：學校特征數據不準確
**缓解措施**:
- 初始數據基于公開資料和经验
- 支持用户补充和修正
- 社区驱動的知識庫更新
- 定期從面試经验收集反馈

### 風险4：學生使用门槛
**缓解措施**:
- 简化初始设置流程
- 提供详细的使用指南
- 设計直觀的Web界面
- 提供示例和演示

### Trade-off：本地存储 vs 云同步
**選擇**: 本地優先
**原因**: 隐私和简单性優先于便利性
**未來**: 可選的云備份功能

## Migration Plan

不适用（新係統，无迁移需求）

## Open Questions

1. **題庫初始數據從哪里來？**
   - 方案：手動输入種子數據（~50題）+ AI扩展生成（~200題）
   - 需要：收集真实面試題目和经验

2. **如何評估AI反馈的準確性？**
   - 方案：A/B测試不同提示詞，收集家長和老师反馈
   - 需要：建立評估標準和测試集

3. **是否需要支持多个學生账號？**
   - 方案：MVP阶段支持单學生，數據庫设計预留user_id字段
   - 未來：添加用户管理功能

4. **如何处理敏感信息（如學生姓名）？**
   - 方案：本地存储，不上傳到AI API
   - 數據發送到API時匿名化处理
