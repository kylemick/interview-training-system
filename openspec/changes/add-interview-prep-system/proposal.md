# Change: 添加升中面試準備係統

## Why

香港小學生升读顶尖中學（如SPCC、QC、LSC）需要通過嚴格的面試考核。面試涵盖英語能力、中文表達、常識、邏輯思維和批判性思考等多个維度。目前缺乏一个係統化的工具來：
- 制定个性化的提升計劃
- 生成針對性的練習任務
- 提供即時、專业的AI反馈
- 跟踪學習進度并識別弱點

该係統通過集成DeepSeek API，为學生提供智能化的面試準備方案，帮助學生係統性地提升面試表现。

## What Changes

- 添加**訓練計劃管理**能力：支持創建、自定义和跟踪多種類型的專項訓練計劃（英語面試、中文面試、常識、邏輯思維等）
- 添加**面試任務生成**能力：基于AI生成針對性的面試練習題目，支持不同難度级別和話題分類
- 添加**練習反馈**能力：學生提交練習答案後，AI提供详细反馈（弱點識別、評分、改進建議、示例答案、進度追踪）
- 添加**弱點分析**能力：基于历史練習數據，持续識別學生的薄弱环节，動態調整訓練重點
- 添加**AI集成**能力：与DeepSeek API集成，確保高质量的內容生成和反馈

## Impact

**新增規格（Specs）：**
- `training-plan` - 訓練計劃管理
- `interview-task` - 面試任務生成
- `practice-feedback` - 練習反馈
- `weakness-analysis` - 弱點分析
- `ai-integration` - AI集成

**技術栈：**
- Python 3.10+ (核心語言)
- SQLite (數據存储)
- DeepSeek API (AI能力)
- Click (CLI界面)
- 未來可扩展：FastAPI (Web API)、React (Web前端)

**數據模型：**
- TrainingPlan（訓練計劃）
- TrainingType（訓練類型：英語面試、中文面試、常識等）
- Task（練習任務）
- PracticeSubmission（練習提交）
- Feedback（AI反馈）
- WeaknessRecord（弱點記錄）

**目標用户：**
- 香港小學5-6年级學生
- 目標學校：SPCC、QC、LSC、DGS、DBS等顶尖直資/官津中學
