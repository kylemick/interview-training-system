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
- 框架：React 18+ with TypeScript 或 Vue 3 + TypeScript
- UI组件：Ant Design / Material-UI / shadcn/ui
- 状态管理：React Context / Zustand (React) 或 Pinia (Vue)
- 路由：React Router / Vue Router
- 图表：ECharts / Chart.js
- 样式：Tailwind CSS / CSS Modules
- 构建工具：Vite

**后端**：
- 运行时：Node.js 18+ 或 Python 3.10+
- 框架：Express / Fastify (Node.js) 或 FastAPI (Python)
- API风格：RESTful API
- 实时通信：WebSocket (AI模拟面试)

**数据库**：
- MySQL 8.0+（关系型数据库）
- ORM：Prisma (Node.js) 或 SQLAlchemy (Python)

**AI集成**：
- DeepSeek API (HTTP客户端)
- 备选：支持OpenAI兼容API的其他模型

**开发工具**：
- 包管理：npm / pnpm (Node.js) 或 pip / poetry (Python)
- 代码规范：ESLint + Prettier (JS/TS) 或 Black + Ruff (Python)
- 类型检查：TypeScript / mypy

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
- **前后端分离**：React/Vue前端 + Node.js/Python后端
- **数据驱动**：以"训练会话"为中心组织数据
- **单一数据源**：MySQL作为唯一真相来源
- **RESTful API**：前后端通过标准HTTP API通信
- **WebSocket**：实时AI对话使用WebSocket
- **提示工程**：通过精心设计的提示词与AI交互，追求结构化输出（JSON）
- **模块化**：每个capability独立模块（plans, practice, feedback, questions, progress, schools）

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
5. **性能要求**：页面响应时间<1秒（本地操作），AI调用<30秒，使用loading动画
6. **浏览器兼容**：支持主流浏览器（Chrome, Edge, Safari, Firefox）

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
   - 初期手动录入种子数据（~50题）
   - 后续考虑社区贡献或采购真题库

## Project Structure (Suggested)

```
interview-training-system/
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   │   ├── Dashboard/
│   │   │   ├── TrainingPlan/
│   │   │   ├── Practice/
│   │   │   ├── Feedback/
│   │   │   ├── Progress/
│   │   │   └── Settings/
│   │   ├── components/     # 通用组件
│   │   ├── hooks/          # 自定义Hooks
│   │   ├── services/       # API调用
│   │   ├── store/          # 状态管理
│   │   ├── utils/          # 工具函数
│   │   └── types/          # TypeScript类型定义
│   ├── public/             # 静态资源
│   └── package.json
│
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── routes/         # API路由
│   │   ├── controllers/    # 业务逻辑
│   │   ├── models/         # 数据模型
│   │   ├── services/       # 核心服务
│   │   │   ├── plans/      # 训练计划管理
│   │   │   ├── practice/   # 练习会话
│   │   │   ├── feedback/   # 反馈生成
│   │   │   ├── questions/  # 题库管理
│   │   │   ├── progress/   # 进度追踪
│   │   │   └── schools/    # 学校特征
│   │   ├── ai/             # AI集成（DeepSeek API）
│   │   ├── db/             # 数据库配置
│   │   └── utils/          # 工具函数
│   └── package.json / requirements.txt
│
├── data/                    # 数据文件
│   ├── (MySQL数据库在服务器中运行，不在项目目录)
│   └── seeds/              # 初始数据（学校、种子题目）
│
├── docs/                    # 文档
├── openspec/               # OpenSpec规格和变更
└── package.json            # 根项目配置（monorepo可选）
```

## Development Philosophy

1. **先简单后复杂**：MVP先做核心流程，再优化细节
2. **用户至上**：功能设计围绕学生和家长的实际需求
3. **数据积累**：设计数据结构时考虑未来分析和改进
4. **持续反馈**：收集使用反馈，快速迭代
5. **AI辅助**：充分利用AI能力，但保留人工干预空间
