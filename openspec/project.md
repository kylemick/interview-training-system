# Project Context

## Purpose

这是一个针对香港小学生升读顶尖中学的面试训练系统。目标学校包括SPCC（圣保罗男女中学）、QC（皇仁书院）、LSC（喇沙书院）等TOP学校。

系统的核心目标：
1. 提供系统化的面试训练，覆盖七大专项：英文口语、中文表达、逻辑思维、时事常识、科学常识、个人成长、小组讨论
2. 使用AI（DeepSeek API）自动生成训练计划、题目和反馈
3. 追踪学习进度，识别弱点并自适应调整训练计划
4. 根据目标学校特点提供针对性建议

## Tech Stack

**前端**：
- 框架：React 18+ with TypeScript
- UI组件：Ant Design
- 状态管理：React Context + Zustand
- 路由：React Router
- 图表：ECharts
- 样式：CSS Modules + Ant Design样式系统
- 构建工具：Vite

**后端**：
- 运行时：Node.js 18+
- 框架：Express with TypeScript
- API风格：RESTful API
- 数据库访问：原生MySQL2驱动（不使用ORM）

**数据库**：
- MySQL 8.0+（关系型数据库）
- 使用原生SQL查询，通过封装的数据库访问层（`src/db/index.ts`）统一管理

**AI集成**：
- DeepSeek API (HTTP客户端)
- 支持OpenAI兼容API的其他模型

**开发工具**：
- 包管理：npm
- 代码规范：ESLint + Prettier
- 类型检查：TypeScript

## Project Conventions

### Code Style
- 前端：遵循Airbnb Style Guide (React) 或 Vue官方风格指南
- 后端：遵循所选语言的标准风格指南（PEP 8 for Python, StandardJS for Node.js）
- 使用清晰的变量和函数命名（英文，但可以包含拼音如 `spccProfile`）
- 优先简洁明了的实现，避免过度工程化
- 注释使用中文，便于维护
- 组件化开发，单一职责原则

### Architecture Patterns
- **本地Web应用**：浏览器访问localhost，本地服务器处理请求
- **前后端分离**：React前端 + Node.js后端
- **数据驱动**：以"训练会话"为中心组织数据
- **单一数据源**：MySQL作为唯一真相来源
- **RESTful API**：前后端通过标准HTTP API通信
- **提示工程**：通过精心设计的提示词与AI交互，追求结构化输出（JSON）
- **模块化**：每个capability独立模块（plans, practice, feedback, questions, progress, schools, settings, weaknesses）
- **数据库访问规范**：统一通过 `src/db/index.ts` 封装的查询函数，使用参数化查询防止SQL注入，正确处理JSON字段解析

### Testing Strategy
- **前端测试**：
  - 组件单元测试（Jest + React Testing Library / Vitest + Vue Test Utils）
  - E2E测试（Playwright / Cypress）关键流程
- **后端测试**：
  - API单元测试（Jest / pytest）
  - 数据模型测试
  - AI集成mock测试
- **集成测试**：端到端测试"创建计划→练习→反馈→查看进度"完整流程
- **手动测试**：UI/UX测试，确保小学生易用性

### Git Workflow
- 使用分支开发：`feature/capability-name`
- Commit message：中文描述，清晰说明改动
- 提交前运行验证和测试
- 完成后合并到 `main` 分支

## Domain Context

### 香港升中面试特点
- 竞争激烈，顶尖学校录取率约5-10%
- 面试形式多样：个人面试、小组讨论、笔试等
- 重点考查：语言能力（中英文）、思维能力、时事关注、科学素养、个人素养
- 不同学校侧重不同：
  - SPCC：国际化、批判性思维、英文表达、科学素养（STEM教育重点学校）
  - QC：学术能力、逻辑推理、传统价值
  - LSC：全人发展、领导力、团队合作

### 七大专项类别
1. **英文口语** (`english-oral`)：自我介绍、日常对话、看图说话、即兴演讲
2. **中文表达** (`chinese-oral`)：朗读、时事讨论、阅读理解、观点阐述
3. **逻辑思维** (`logic-thinking`)：数学应用题、推理题、解难题、脑筋急转弯
4. **时事常识** (`current-affairs`)：新闻热点、社会议题、香港本地事务、国际事件
5. **科学常识** (`science-knowledge`)：科学原理、生活中的科学、环境保护、科技发展、STEM相关话题（尤其SPCC重视）
6. **个人成长** (`personal-growth`)：兴趣爱好、学习经历、志向抱负、自我认知
7. **小组讨论** (`group-discussion`)：合作技巧、表达观点、倾听回应、领导协调

### 用户画像
- **主要用户**：小学五六年级学生（10-12岁）
- **辅助用户**：家长（设置计划、查看报告）
- **使用场景**：家中日常练习，每次10-30分钟
- **技术水平**：学生具备基本电脑/平板操作能力

## Important Constraints

1. **隐私保护**：学生练习数据必须本地存储，Web服务仅监听localhost
2. **AI成本控制**：合理设计提示词，避免过长的上下文；考虑缓存和批处理
3. **简单部署**：家长应能一键启动（如双击运行脚本或安装包），自动打开浏览器
4. **适龄设计**：界面和反馈语言适合小学生理解，避免过于专业的术语
5. **性能要求**：
   - 页面响应时间 < 1秒（本地操作）
   - API简单查询响应 < 500ms
   - API复杂查询响应 < 2秒
   - AI调用 < 30秒，使用loading动画
   - 前端使用React.memo和useMemo优化渲染性能
   - 后端使用数据库索引和查询优化
6. **浏览器兼容**：支持主流浏览器（Chrome, Edge, Safari, Firefox）
7. **英文题库语言规范**：英文口语（english-oral）类别的所有内容（题目、反馈、参考答案）必须强制使用英文，AI生成时在提示词开头明确限定语言
8. **MySQL访问规范**：
   - 统一使用参数化查询防止SQL注入
   - **⚠️ 重要：LIMIT 和 OFFSET 子句不能使用参数绑定（MySQL2驱动限制）**
     - **禁止使用**：`LIMIT ?` 或 `OFFSET ?`（会导致SQL语法错误）
     - **必须使用**：直接拼接数字，但必须确保安全性：
       1. 使用 `parseInt()` 或 `Number()` 转换为数字
       2. 使用 `Math.max()` 和 `Math.min()` 限制范围
       3. 禁止直接拼接用户输入，必须先验证和转换
       4. 设置合理的上限（如 LIMIT 限制在 1-1000，OFFSET 限制在 0-100000）
     - **正确示例**：
       ```typescript
       const safeLimit = Math.max(1, Math.min(parseInt(count) || 10, 100));
       const safeOffset = Math.max(0, parseInt(offset) || 0);
       const sql = `SELECT * FROM table LIMIT ${safeLimit} OFFSET ${safeOffset}`;
       ```
     - **错误示例**：
       ```typescript
       // ❌ 错误：LIMIT 不能使用参数绑定
       const sql = `SELECT * FROM table LIMIT ?`;
       await query(sql, [count]);
       
       // ❌ 错误：直接拼接用户输入，不安全
       const sql = `SELECT * FROM table LIMIT ${count}`;
       ```
   - JSON字段必须正确解析（处理字符串和对象两种情况）
   - 学校列表等下拉选项必须从数据库实时获取
   - 所有数据库操作通过封装的 `src/db/index.ts` 函数
9. **文档和测试要求**：所有代码变更必须更新相关文档，并通过测试验证确保功能正常

## External Dependencies

1. **DeepSeek API**
   - 用途：生成训练计划、题目、反馈分析
   - 文档：https://platform.deepseek.com/docs
   - 需要：API Key（用户提供，存储在本地配置文件）
   - 备份方案：支持切换到其他兼容OpenAI API的模型

2. **MySQL**
   - 用途：关系型数据库，本地数据存储
   - 版本：8.0+
   - 安装：通过 setup.sh/setup.bat 自动安装，或参考 docs/MYSQL_SETUP.md

3. **（可选）题库数据源**
   - 推荐使用AI生成题目功能，而非依赖种子数据
   - 系统支持手动录入和批量导入
   - 种子数据可通过API手动触发导入（不自动导入）

## Project Structure

```
interview-training-system/
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   │   ├── Dashboard/         # 仪表盘
│   │   │   ├── TrainingPlan/     # 训练计划
│   │   │   ├── Practice/         # 练习界面
│   │   │   ├── Feedback/         # 反馈查看
│   │   │   ├── Progress/         # 进度追踪
│   │   │   ├── Questions/        # 题库管理
│   │   │   ├── Schools/          # 学校档案
│   │   │   ├── Settings/        # 系统设置
│   │   │   ├── DataManagement/   # 数据管理
│   │   │   └── InterviewMemory/ # 面试回忆
│   │   ├── components/     # 通用组件（Layout等）
│   │   ├── store/          # 状态管理（useAppStore, useSessionStore）
│   │   ├── utils/          # 工具函数（api.ts等）
│   │   ├── App.tsx         # 主应用组件
│   │   ├── main.tsx        # 入口文件
│   │   └── index.css      # 全局样式
│   ├── public/             # 静态资源
│   └── package.json
│
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── routes/         # API路由
│   │   │   ├── ai.ts              # AI服务路由
│   │   │   ├── plans.ts           # 训练计划路由
│   │   │   ├── sessions.ts        # 练习会话路由
│   │   │   ├── questions.ts       # 题库路由
│   │   │   ├── schools.ts         # 学校档案路由
│   │   │   ├── feedback.ts        # 反馈路由
│   │   │   ├── settings.ts        # 系统设置路由
│   │   │   ├── weaknesses.ts      # 弱点分析路由
│   │   │   └── data.ts            # 数据管理路由
│   │   ├── ai/             # AI集成（DeepSeek API）
│   │   │   ├── deepseek.ts        # DeepSeek客户端
│   │   │   ├── trainingPlanner.ts # 训练计划生成
│   │   │   ├── questionGenerator.ts # 题目生成
│   │   │   ├── feedbackGenerator.ts # 反馈生成
│   │   │   └── schoolProfile.ts   # 学校档案生成
│   │   ├── db/             # 数据库配置
│   │   │   ├── index.ts           # 数据库访问封装
│   │   │   ├── schema.sql         # 数据库Schema
│   │   │   └── seeds/             # 种子数据
│   │   ├── middleware/     # 中间件
│   │   │   ├── errorHandler.ts    # 错误处理
│   │   │   └── logger.ts          # 日志记录
│   │   ├── types/          # TypeScript类型定义
│   │   ├── test/           # 测试文件
│   │   └── index.ts        # 入口文件
│   ├── migrations/         # 数据库迁移
│   ├── data/               # 数据文件（settings.json等）
│   └── package.json
│
├── docs/                    # 文档
│   ├── API.md              # API文档
│   ├── DEVELOPMENT.md      # 开发指南
│   ├── MYSQL_SETUP.md      # MySQL安装指南
│   ├── PERFORMANCE.md      # 性能优化文档
│   └── ...
│
├── openspec/               # OpenSpec规格和变更
│   ├── project.md          # 项目文档（本文件）
│   ├── AGENTS.md           # AI助手使用指南
│   ├── specs/              # 已归档的能力规范
│   │   ├── question-bank/  # 题库管理
│   │   └── practice-linkage/ # 计划-练习联动
│   └── changes/            # 变更提案
│       ├── add-interview-training-system/ # 主系统变更
│       ├── optimize-page-performance/      # 性能优化
│       ├── link-plans-to-practice/       # 计划联动
│       └── archive/                       # 已归档变更
│
├── dev.sh / dev.bat        # 开发启动脚本
├── setup.sh / setup.bat    # 安装脚本
└── package.json            # 根项目配置
```

## API Endpoints Overview

### 核心API路由

- `/api/schools` - 学校档案管理（CRUD）
- `/api/questions` - 题库管理（查询、创建、AI生成）
- `/api/plans` - 训练计划管理（创建、查询、任务管理）
- `/api/sessions` - 练习会话管理（创建、提交答案、完成）
- `/api/feedback` - 反馈查询和分析
- `/api/ai` - AI服务（生成计划、题目、反馈、学校档案）
- `/api/settings` - 系统设置（学生信息、API配置）
- `/api/weaknesses` - 弱点分析（查询、趋势分析）
- `/api/data` - 数据管理（导出、导入、种子数据）
- `/api/progress` - 进度统计（待完善）

详细API文档请参考：`interview-training-system/docs/API.md`

## Database Schema Overview

### 核心数据表

- `school_profiles` - 学校档案表（code, name, focus_areas, interview_style）
- `questions` - 题库表（category, question_text, difficulty, reference_answer, school_code）
- `training_plans` - 训练计划表（student_name, target_school, category_allocation）
- `daily_tasks` - 每日任务表（plan_id, task_date, category, status）
- `sessions` - 练习会话表（category, mode, status, task_id）
- `qa_records` - 问答记录表（session_id, question_id, student_answer）
- `feedback` - 反馈记录表（session_id, qa_record_id, scores, strengths, weaknesses）
- `student_weaknesses` - 学生弱点分析表（category, weakness_type, severity, status）

详细Schema请参考：`interview-training-system/backend/src/db/schema.sql`

## Implemented Capabilities

### 已归档到specs的能力（已完成实现）

1. **Question Bank (题库管理)** - `specs/question-bank/`
   - 题目数据模型和七大专项类别支持
   - 手动录入和AI生成题目
   - 题目查询、筛选和统计
   - 英文题库语言强制规范
   - 学校列表下拉选择集成

2. **Practice Linkage (计划-练习联动)** - `specs/practice-linkage/`
   - 从训练计划任务创建练习会话
   - 自动任务状态同步
   - 双模式支持（任务模式/自由模式）
   - 任务完成流程引导

### 已实现但待归档的能力（在变更中定义）

3. **Training Plans (训练计划管理)** - `changes/add-interview-training-system/specs/training-plans/`
   - AI生成个性化训练计划
   - 计划查看和调整
   - 每日任务管理
   - 计划元数据管理

4. **Interview Practice (面试练习)** - `changes/add-interview-training-system/specs/interview-practice/`
   - 启动练习会话
   - 文字问答模式
   - AI模拟面试官（待实现）
   - 题目生成和扩展
   - 会话管理（暂停/恢复）

5. **AI Feedback (AI反馈系统)** - `changes/add-interview-training-system/specs/ai-feedback/`
   - 语言质量分析
   - 内容深度评估
   - 弱点识别
   - 参考答案生成
   - 学校针对性建议
   - 进步追踪反馈

6. **Progress Tracking (进度追踪)** - `changes/add-interview-training-system/specs/progress-tracking/`
   - 会话历史记录
   - 进度统计和可视化
   - 弱点追踪
   - 里程碑和成就
   - 进度报告生成
   - 数据导出

7. **School Profiles (学校特征管理)** - `changes/add-interview-training-system/specs/school-profiles/`
   - 学校特征数据模型
   - TOP学校数据录入（SPCC, QC, LSC等）
   - 学校特征查询和应用
   - 学校特征管理和对比

8. **System Settings (系统设置管理)** - `changes/add-interview-training-system/specs/system-settings/`
   - 基本设置管理（学生信息、目标学校）
   - AI API配置
   - 数据备份与恢复
   - 系统信息展示

### 已实现的额外功能

9. **Student Weaknesses Analysis (学生弱点分析)**
   - AI自动识别6种弱点类型
   - 弱点趋势分析
   - 根据弱点生成针对性题目
   - 练习效果追踪

10. **Interview Memory (面试回忆录入)**
    - 批量录入面试回忆
    - AI自动提取题目和弱点
    - 智能分类和标记

11. **Data Management (数据管理)**
    - 数据导出（JSON格式）
    - 数据导入和恢复
    - 种子数据初始化

## Development Philosophy

1. **先简单后复杂**：MVP先做核心流程，再优化细节
2. **用户至上**：功能设计围绕学生和家长的实际需求
3. **数据积累**：设计数据结构时考虑未来分析和改进
4. **持续反馈**：收集使用反馈，快速迭代
5. **AI辅助**：充分利用AI能力，但保留人工干预空间
6. **规范驱动**：使用OpenSpec规范驱动开发，确保文档与代码同步
7. **性能优先**：关注页面加载速度和API响应时间，持续优化
8. **文档同步**：所有代码变更必须更新相关文档，确保文档准确性
