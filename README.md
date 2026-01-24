# 升中面试训练系统

> 为香港小学生提供升读顶尖中学（SPCC、QC、LSC等）的 AI 驱动面试训练平台

[![GitHub](https://img.shields.io/badge/GitHub-kylemick/interview--training--system-blue)](https://github.com/kylemick/interview-training-system)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![OpenSpec](https://img.shields.io/badge/Methodology-OpenSpec-orange)](openspec/)

---

## 🎯 项目简介

本项目采用 **OpenSpec 规范驱动开发**，为香港小学生提供个性化的升中面试准备方案。

### 核心特色

- ✅ **七大专项训练**：英文口语、中文表达、逻辑思维、时事常识、科学常识、个人成长、小组讨论
- 🤖 **AI 智能辅助**：基于 DeepSeek API 的训练计划生成、题目生成和个性化反馈
- 📊 **进度追踪**：可视化学习进度，智能识别弱点并自适应调整
- 🏫 **学校针对性**：针对 SPCC、QC、LSC 等顶尖学校的特点定制训练
- 🔒 **数据隐私**：本地运行，所有数据存储在本地

---

## 📁 项目结构

```
.
├── openspec/                          # OpenSpec 规范文档
│   ├── project.md                     # 项目元信息
│   ├── AGENTS.md                      # AI 助手使用指南
│   └── changes/add-interview-training-system/
│       ├── proposal.md                # 项目提案
│       ├── design.md                  # 详细设计文档
│       ├── tasks.md                   # 实施任务列表
│       ├── science-knowledge-guide.md # 科学常识专项指南
│       └── specs/                     # 6 个核心能力规范
│           ├── training-plans/
│           ├── interview-practice/
│           ├── ai-feedback/
│           ├── question-bank/
│           ├── progress-tracking/
│           └── school-profiles/
│
└── interview-training-system/         # 应用程序代码
    ├── frontend/                      # React 前端
    │   ├── src/
    │   │   ├── pages/                 # 7 个核心页面
    │   │   ├── components/
    │   │   └── App.tsx
    │   └── package.json
    │
    ├── backend/                       # Node.js 后端
    │   ├── src/
    │   │   ├── db/                    # 数据库（MySQL）
    │   │   ├── ai/                    # AI 服务集成
    │   │   ├── middleware/
    │   │   └── index.ts
    │   └── package.json
    │
    ├── docs/                          # 完整文档
    │   ├── API.md
    │   ├── DEVELOPMENT.md
    │   ├── MYSQL_SETUP.md
    │   ├── SETUP_GUIDE.md
    │   └── TESTING.md
    │
    ├── setup.sh / setup.bat           # 一键安装脚本
    ├── dev.sh / dev.bat               # 一键启动脚本
    └── README.md
```

---

## 🚀 快速开始

### 方法1：一键安装（推荐）

**macOS / Linux:**
```bash
cd interview-training-system
./setup.sh
```

**Windows:**
```cmd
cd interview-training-system
setup.bat
```

安装脚本会自动完成：
- ✅ 检测并安装 MySQL
- ✅ 配置数据库密码
- ✅ 配置 DeepSeek API Key
- ✅ 安装所有依赖
- ✅ 初始化数据库
- ✅ 启动应用

### 方法2：手动安装

详见：[interview-training-system/QUICKSTART.md](interview-training-system/QUICKSTART.md)

---

## 📦 技术栈

### 前端
- **React 18** + TypeScript + Vite
- **Ant Design** - UI 组件库
- **Zustand** - 状态管理
- **ECharts** - 数据可视化
- **React Router** - 路由

### 后端
- **Node.js** + Express + TypeScript
- **MySQL** (mysql2) - 关系型数据库
- **DeepSeek API** - AI 功能
- **Zod** - 数据验证

### 数据库
- 9 个核心数据表
- 支持七大专项训练分类
- 学校档案、题库、训练计划、进度追踪

---

## 📚 OpenSpec 开发方法

本项目采用 **OpenSpec 规范驱动开发**，所有重大变更都遵循以下流程：

1. **Proposal** (`openspec/changes/*/proposal.md`) - 提案阶段
   - 为什么需要这个变更？
   - 变更的范围和影响

2. **Design** (`openspec/changes/*/design.md`) - 设计阶段
   - 详细的技术设计
   - 架构决策
   - 数据模型

3. **Specs** (`openspec/changes/*/specs/*/spec.md`) - 规范阶段
   - 每个能力的详细规范
   - 使用 SHALL/MUST 等规范性语言
   - 测试验收标准

4. **Tasks** (`openspec/changes/*/tasks.md`) - 实施阶段
   - 详细的实施任务列表
   - 任务优先级和依赖

### 查看完整规范

```bash
# 查看项目提案
cat openspec/changes/add-interview-training-system/proposal.md

# 查看详细设计
cat openspec/changes/add-interview-training-system/design.md

# 查看某个能力的规范
cat openspec/changes/add-interview-training-system/specs/training-plans/spec.md
```

---

## 🎓 核心功能

### 1. 训练计划生成
- 根据目标学校和时间自动生成个性化计划
- 智能分配七大专项训练比例
- 支持手动调整和 AI 自适应

### 2. 面试练习
- 文字问答模式
- AI 模拟面试官（连续追问）
- 自动生成题目

### 3. AI 反馈分析
- 语言质量评估
- 内容深度分析
- 弱点识别
- 参考答案和改进建议

### 4. 智能题库
- 七大专项分类
- 难度分级（easy/medium/hard）
- 学校针对性题目
- 支持从面试回忆中提取

### 5. 进度追踪
- 按类别统计表现
- 可视化进度图表
- 薄弱环节识别
- 改进趋势分析

### 6. 学校档案
- SPCC、QC、LSC 等顶尖学校特点
- 面试重点领域
- 面试风格说明

---

## 🏫 支持的学校

- **SPCC** (St. Paul's Co-educational College)
- **QC** (Queen's College)
- **LSC** (La Salle College)
- 更多学校持续添加中...

---

## 📖 文档

- [快速开始](interview-training-system/QUICKSTART.md)
- [MySQL 安装指南](interview-training-system/docs/MYSQL_SETUP.md)
- [开发文档](interview-training-system/docs/DEVELOPMENT.md)
- [API 文档](interview-training-system/docs/API.md)
- [测试指南](interview-training-system/docs/TESTING.md)
- [安装脚本指南](interview-training-system/docs/SETUP_GUIDE.md)

---

## 🤝 贡献

欢迎贡献！请遵循 OpenSpec 规范：

1. Fork 本仓库
2. 在 `openspec/changes/` 创建新的变更提案
3. 编写 proposal.md、design.md 和相关 specs
4. 实施变更
5. 提交 Pull Request

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- [DeepSeek](https://www.deepseek.com/) - AI 能力支持
- [OpenSpec](https://openspec.dev/) - 开发方法论
- React、Node.js、MySQL 等开源社区

---

**让每个孩子都能获得优质的面试准备！** 🎓✨
