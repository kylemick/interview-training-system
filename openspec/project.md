# Project Context

## Purpose

這是一個針對香港小學生升讀頂尖中學的面試訓練係統。目標學校包括SPCC（聖保羅男女中學）、QC（皇仁書院）、LSC（喇沙書院）等TOP學校。

係統的核心目標：
1. 提供係統化的面試訓練，覆蓋七大專項：英文口語、中文表達、邏輯思維、時事常識、科學常識、個人成長、小組討論
2. 使用AI（DeepSeek API）自動生成訓練計劃、題目和反饋
3. 追蹤學習進度，識別弱點並自適應調整訓練計劃
4. 根據目標學校特點提供針對性建議

## Tech Stack

**前端**：
- 框架：React 18+ with TypeScript
- UI組件：Ant Design
- 狀態管理：React Context + Zustand
- 路由：React Router
- 圖表：ECharts
- 樣式：CSS Modules + Ant Design樣式係統
- 構建工具：Vite

**後端**：
- 運行時：Node.js 18+
- 框架：Express with TypeScript
- API風格：RESTful API
- 數據庫訪問：原生MySQL2驅動（不使用ORM）

**數據庫**：
- MySQL 8.0+（關係型數據庫）
- 使用原生SQL查詢，通過封裝的數據庫訪問層（`src/db/index.ts`）統一管理

**AI集成**：
- DeepSeek API (HTTP客戶端)
- 支持OpenAI兼容API的其他模型

**開發工具**：
- 包管理：npm
- 代碼規範：ESLint + Prettier
- 類型檢查：TypeScript

## Project Conventions

### Code Style
- 前端：遵循Airbnb Style Guide (React) 或 Vue官方風格指南
- 後端：遵循所選語言的標準風格指南（PEP 8 for Python, StandardJS for Node.js）
- 使用清晰的變量函數命名（英文，但可以包含拼音如 `spccProfile`）
- 優先簡潔明瞭的實現，避免過度工程化
- 註釋使用繁體中文，便於維護
- 組件化開發，單一職責原則

### Architecture Patterns
- **本地Web應用**：瀏覽器訪問localhost，本地服務器處理請求
- **前後端分離**：React前端 + Node.js後端
- **數據驅動**：以"訓練會話"為中心組織數據
- **單一數據源**：MySQL作為唯一真相來源
- **RESTful API**：前後端通過標準HTTP API通信
- **提示工程**：通過精心設計的提示詞與AI交互，追求結構化輸出（JSON）
- **模塊化**：每個capability獨立模塊（plans, practice, feedback, questions, progress, schools, settings, weaknesses）
- **數據庫訪問規範**：統一通過 `src/db/index.ts` 封裝的查詢函數，使用參數化查詢防止SQL注入，正確處理JSON字段解析

### Testing Strategy
- **前端測試**：
  - 組件單元測試（Jest + React Testing Library / Vitest + Vue Test Utils）
  - E2E測試（Playwright / Cypress）關鍵流程
- **後端測試**：
  - API單元測試（Jest / pytest）
  - 數據模型測試
  - AI集成mock測試
- **集成測試**：端到端測試"創建計劃→練習→反饋→查看進度"完整流程
- **手動測試**：UI/UX測試，確保小學生易用性

### Git Workflow
- 使用分支開發：`feature/capability-name`
- Commit message：中文描述，清晰說明改動
- 提交前運行驗證和測試
- 完成後合併到 `main` 分支

## Domain Context

### 香港升中面試特點
- 競爭激烈，頂尖學校錄取率約5-10%
- 面試形式多樣：個人面試、小組討論、筆試等
- 重點考查：語言能力（中英文）、思維能力、時事關注、科學素養、個人素養
- 不同學校側重不同：
  - SPCC：國際化、批判性思維、英文表達、科學素養（STEM教育重點學校）
  - QC：學術能力、邏輯推理、傳統價值
  - LSC：全人發展、領導力、團隊合作

### 七大專項類別
1. **英文口語** (`english-oral`)：自我介绍、日常對話、看图說話、即兴演讲
2. **中文表達** (`chinese-oral`)：朗读、時事討論、阅读理解、觀點阐述
3. **邏輯思維** (`logic-thinking`)：數學应用題、推理題、解難題、脑筋急转弯
4. **時事常識** (`current-affairs`)：新闻热點、社會議題、香港本地事務、国际事件
5. **科學常識** (`science-knowledge`)：科學原理、生活中的科學、环境保护、科技發展、STEM相關話題（尤其SPCC重视）
6. **个人成長** (`personal-growth`)：兴趣爱好、學習经历、志向抱负、自我认知
7. **小組討論** (`group-discussion`)：合作技巧、表達觀點、倾听回应、領導协調

### 四个學科能力類別
8. **中文阅读理解** (`chinese-reading`)：通過阅读文章，考察阅读理解、字詞理解、觀點提炼等能力
9. **英文阅读理解** (`english-reading`)：通過阅读英文文章，考察阅读理解、詞汇、觀點分析等能力
10. **數學基础** (`mathematics`)：考察計算能力、數學概念理解、基础數學知識应用
11. **科學实践** (`science-practice`)：考察科學现象說明、科學推理、科學行为等能力

### 用户画像
- **主要用户**：小學五六年级學生（10-12岁）
- **辅助用户**：家長（设置計劃、查看报告）
- **使用场景**：家中日常練習，每次10-30分鐘
- **技術水平**：學生具備基本电脑/平板操作能力

## Important Constraints

1. **隐私保护**：學生練習數據必须本地存储，Web服務仅监听localhost
2. **AI成本控制**：合理设計提示詞，避免過長的上下文；考虑缓存和批处理
3. **简单部署**：家長应能一键启動（如双击运行脚本或安装包），自動打開浏览器
4. **适龄设計**：界面和反馈語言适合小學生理解，避免過于專业的術語
5. **性能要求**：
   - 页面响应時間 < 1秒（本地操作）
   - API简单查询响应 < 500ms
   - API复杂查询响应 < 2秒
   - AI調用 < 30秒，使用loading動画
   - 前端使用React.memo和useMemo優化渲染性能
   - 後端使用數據庫索引和查询優化
6. **浏览器兼容**：支持主流浏览器（Chrome, Edge, Safari, Firefox）
7. **英文題庫語言規范**：英文口語（english-oral）類別的所有內容（題目、反馈、參考答案）必须强制使用英文，AI生成時在提示詞開头明確限定語言
8. **MySQL访問規范**：
   - 統一使用參數化查询防止SQL注入
   - **⚠️ 重要：LIMIT 和 OFFSET 子句不能使用參數绑定（MySQL2驱動限制）**
     - **禁止使用**：`LIMIT ?` 或 `OFFSET ?`（會導致SQL語法错误）
     - **必须使用**：直接拼接數字，但必须確保安全性：
       1. 使用 `parseInt()` 或 `Number()` 转换为數字
       2. 使用 `Math.max()` 和 `Math.min()` 限制范围
       3. 禁止直接拼接用户输入，必须先验证和转换
       4. 设置合理的上限（如 LIMIT 限制在 1-1000，OFFSET 限制在 0-100000）
     - **正確示例**：
       ```typescript
       const safeLimit = Math.max(1, Math.min(parseInt(count) || 10, 100));
       const safeOffset = Math.max(0, parseInt(offset) || 0);
       const sql = `SELECT * FROM table LIMIT ${safeLimit} OFFSET ${safeOffset}`;
       ```
     - **错误示例**：
       ```typescript
       // ❌ 错误：LIMIT 不能使用參數绑定
       const sql = `SELECT * FROM table LIMIT ?`;
       await query(sql, [count]);
       
       // ❌ 错误：直接拼接用户输入，不安全
       const sql = `SELECT * FROM table LIMIT ${count}`;
       ```
   - JSON字段必须正確解析（处理字符串和對象两種情况）
   - 學校列表等下拉選項必须從數據庫实時获取
   - 所有數據庫操作通過封装的 `src/db/index.ts` 函數
9. **文檔和测試要求**：所有代碼变更必须更新相關文檔，并通過测試验证確保功能正常
10. **AI調用超時規范**：
    - **⚠️ 重要：所有AI相關接口必须设置无超時限制**
    - **後端規范**：
      - DeepSeek客户端（`backend/src/ai/deepseek.ts`）中的axios实例必须设置 `timeout: 0`
      - 所有AI服務路由（`backend/src/routes/ai.ts`）不应设置请求超時
    - **前端規范**：
      - 所有AI相關API調用必须显式设置 `{ timeout: 0 }`
      - 包括但不限于以下接口：
        - `api.ai.*` - 所有AI服務接口（生成題目、生成計劃、生成學校檔案、提取面試回憶、保存弱點、生成學習素材等）
        - `api.feedback.generate` - 生成反馈
        - `api.feedback.batchGenerate` - 批量生成反馈
        - `api.plans.create` - 創建訓練計劃（會調用AI生成）
        - `api.plans.createFromWeakness` - 從弱點創建計劃
        - `api.sessions.createSchoolRoundMock` - 創建學校輪次模拟面試
        - `api.weaknesses.generateQuestions` - 從弱點生成題目
      - **正確示例**：
        ```typescript
        // ✅ 正確：AI接口不设置超時
        api.ai.generateQuestions(data, { timeout: 0 })
        ```
      - **错误示例**：
        ```typescript
        // ❌ 错误：不要使用默认超時
        api.ai.generateQuestions(data) // 會使用默认的10秒超時
        ```
    - **原因**：AI处理可能需要较長時間（生成題目、反馈、計劃等），不应因超時而中断，確保AI能够完整处理请求
11. **前端AI交互組件規范**：
    - **⚠️ 重要：所有AI調用页面必须使用通用悬浮框組件**
    - **組件位置**：`frontend/src/components/AiThinkingDisplay/`
    - **狀態管理**：使用 `frontend/src/store/useAiThinkingStore.ts` 管理AI思考狀態
    - **Hook使用**：使用 `frontend/src/hooks/useAiThinking.ts` 简化AI調用時的思考展示管理
    - **适用范围**：所有涉及AI調用的页面必须集成 `AiThinkingDisplay` 組件，包括但不限于：
      - 題庫管理页面（生成題目）
      - 訓練計劃页面（生成計劃）
      - 練習页面（生成反馈）
      - 學校檔案页面（生成學校檔案）
      - 面試回憶页面（提取面試回憶）
      - 弱點分析页面（生成題目和學習素材）
      - Dashboard页面（生成題目）
    - **原因**：保持用戶體驗一致性，避免各自實現不同的loading提示，統一展示AI思考過程，讓用戶了解AI正在處理什麼任務
12. **繁體中文規範**：
    - **⚠️ 重要：所有中文內容必須使用繁體中文，禁止使用簡體中文**
    - **強制要求**：
      - 所有代碼註釋和文檔字符串必須使用繁體中文
      - 所有項目文檔（README、設計文檔、API文檔等）必須使用繁體中文
      - **所有 OpenSpec 目錄下的文件（`openspec/`）必須使用繁體中文**，包括：
        - `openspec/project.md`、`openspec/AGENTS.md` 等核心文檔
        - `openspec/specs/` 目錄下的所有規範文件
        - `openspec/changes/` 目錄下的所有變更提案、任務清單、設計文檔等
      - 所有用戶界面文字（按鈕、標籤、提示信息等）必須使用繁體中文
      - 所有錯誤消息和日誌輸出必須使用繁體中文
      - **所有 AI 提示詞和 AI 生成的內容必須使用繁體中文（除英文專項外）**：
        - 所有調用 DeepSeek API 的提示詞必須明確指定語言要求
        - 英文專項（english-oral, english-reading）使用英文提示詞並強制返回英文
        - 其他所有類別必須在提示詞開頭明確指定「必須使用繁體中文」
        - 所有 AI 服務文件（`backend/src/ai/*.ts`）中的提示詞必須包含語言規範
        - 所有路由文件（`backend/src/routes/*.ts`）中直接調用 AI 的地方也必須包含語言規範
      - 所有數據庫註釋和種子數據中的中文內容必須使用繁體中文
      - 所有代碼中的字符串字面量（如提示信息、錯誤消息）必須使用繁體中文
    - **原因**：項目目標用戶是香港小學生，使用繁體中文符合本地使用習慣，體現項目的專業性和對本地文化的尊重
    - **例外情況**：
      - 英文專項（english-oral, english-reading）的AI生成內容必須使用英文
      - 代碼變量名、函數名、類名等技術標識符使用英文
      - API接口路徑和參數名使用英文
      - 英文專項的題目和參考答案保持英文

## External Dependencies

1. **DeepSeek API**
   - 用途：生成訓練計劃、題目、反饋分析
   - 文檔：https://platform.deepseek.com/docs
   - 需要：API Key（用戶提供，存儲在本地配置文件）
   - 備份方案：支持切換到其他兼容OpenAI API的模型

2. **MySQL**
   - 用途：關係型數據庫，本地數據存儲
   - 版本：8.0+
   - 安裝：通過 setup.sh/setup.bat 自動安裝，或參考 docs/MYSQL_SETUP.md

3. **（可選）題庫數據源**
   - 推薦使用AI生成題目功能，而非依賴種子數據
   - 係統支持手動錄入和批量導入
   - 種子數據可通過API手動觸發導入（不自動導入）

## Project Structure

```
interview-training-system/
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── pages/          # 页面組件
│   │   │   ├── Dashboard/         # 仪表盘
│   │   │   ├── TrainingPlan/     # 訓練計劃
│   │   │   ├── Practice/         # 練習界面
│   │   │   ├── Feedback/         # 反馈查看
│   │   │   ├── Progress/         # 進度追踪
│   │   │   ├── Questions/        # 題庫管理
│   │   │   ├── Schools/          # 學校檔案
│   │   │   ├── Settings/        # 係統设置
│   │   │   ├── DataManagement/   # 數據管理
│   │   │   └── InterviewMemory/ # 面試回憶
│   │   ├── components/     # 通用組件
│   │   │   ├── Layout/            # 布局組件
│   │   │   └── AiThinkingDisplay/ # AI思考展示悬浮框組件
│   │   ├── store/          # 狀態管理（useAppStore, useSessionStore）
│   │   ├── utils/          # 工具函數（api.ts等）
│   │   ├── App.tsx         # 主应用組件
│   │   ├── main.tsx        # 入口文件
│   │   └── index.css      # 全局樣式
│   ├── public/             # 静態資源
│   └── package.json
│
├── backend/                 # 後端服務
│   ├── src/
│   │   ├── routes/         # API路由
│   │   │   ├── ai.ts              # AI服務路由
│   │   │   ├── plans.ts           # 訓練計劃路由
│   │   │   ├── sessions.ts        # 練習會話路由
│   │   │   ├── questions.ts       # 題庫路由
│   │   │   ├── schools.ts         # 學校檔案路由
│   │   │   ├── feedback.ts        # 反饋路由
│   │   │   ├── settings.ts        # 係統設置路由
│   │   │   ├── weaknesses.ts      # 弱點分析路由
│   │   │   └── data.ts            # 數據管理路由
│   │   ├── ai/             # AI集成（DeepSeek API）
│   │   │   ├── deepseek.ts        # DeepSeek客戶端
│   │   │   ├── trainingPlanner.ts # 訓練計劃生成
│   │   │   ├── questionGenerator.ts # 題目生成
│   │   │   ├── feedbackGenerator.ts # 反饋生成
│   │   │   └── schoolProfile.ts   # 學校檔案生成
│   │   ├── db/             # 數據庫配置
│   │   │   ├── index.ts           # 數據庫訪問封裝
│   │   │   ├── schema.sql         # 數據庫Schema
│   │   │   └── seeds/             # 種子數據
│   │   ├── middleware/     # 中間件
│   │   │   ├── errorHandler.ts    # 錯誤處理
│   │   │   └── logger.ts          # 日誌記錄
│   │   ├── types/          # TypeScript類型定义
│   │   ├── test/           # 测試文件
│   │   └── index.ts        # 入口文件
│   ├── migrations/         # 數據庫迁移
│   ├── data/               # 數據文件（settings.json等）
│   └── package.json
│
├── docs/                    # 文檔
│   ├── API.md              # API文檔
│   ├── DEVELOPMENT.md      # 開發指南
│   ├── MYSQL_SETUP.md      # MySQL安装指南
│   ├── PERFORMANCE.md      # 性能優化文檔
│   └── ...
│
├── openspec/               # OpenSpec規格和变更
│   ├── project.md          # 項目文檔（本文件）
│   ├── AGENTS.md           # AI助手使用指南
│   ├── specs/              # 已归檔的能力規范
│   │   ├── question-bank/  # 題庫管理
│   │   └── practice-linkage/ # 計劃-練習聯動
│   └── changes/            # 变更提案
│       ├── add-interview-training-system/ # 主係統变更
│       ├── optimize-page-performance/      # 性能優化
│       ├── link-plans-to-practice/       # 計劃聯動
│       └── archive/                       # 已归檔变更
│
├── dev.sh / dev.bat        # 開發启動脚本
├── setup.sh / setup.bat    # 安装脚本
└── package.json            # 根項目配置
```

## API Endpoints Overview

### 核心API路由

- `/api/schools` - 學校檔案管理（CRUD）
- `/api/questions` - 題庫管理（查詢、創建、AI生成）
- `/api/plans` - 訓練計劃管理（創建、查詢、任務管理）
- `/api/sessions` - 練習會話管理（創建、提交答案、完成）
- `/api/feedback` - 反饋查詢和分析
- `/api/ai` - AI服務（生成計劃、題目、反饋、學校檔案）
- `/api/settings` - 係統設置（學生信息、API配置）
- `/api/weaknesses` - 弱點分析（查詢、趨勢分析）
- `/api/data` - 數據管理（導出、導入、種子數據）
- `/api/progress` - 進度統計（待完善）

详细API文檔请參考：`interview-training-system/docs/API.md`

## Database Schema Overview

### 核心數據表

- `school_profiles` - 學校檔案表（code, name, focus_areas, interview_style）
- `questions` - 題庫表（category, question_text, difficulty, reference_answer, school_code）
- `training_plans` - 訓練計劃表（student_name, target_school, category_allocation）
- `daily_tasks` - 每日任務表（plan_id, task_date, category, status）
- `sessions` - 練習會話表（category, mode, status, task_id）
- `qa_records` - 問答記錄表（session_id, question_id, student_answer）
- `feedback` - 反饋記錄表（session_id, qa_record_id, scores, strengths, weaknesses）
- `student_weaknesses` - 學生弱點分析表（category, weakness_type, severity, status）

详细Schema请參考：`interview-training-system/backend/src/db/schema.sql`

## Implemented Capabilities

### 已归檔到specs的能力（已完成实现）

1. **Question Bank (題庫管理)** - `specs/question-bank/`
   - 題目數據模型和七大專項類別支持
   - 手動錄入和AI生成題目
   - 題目查詢、篩選和統計
   - 英文題庫語言強制規範
   - 學校列表下拉選擇集成

2. **Practice Linkage (計劃-練習聯動)** - `specs/practice-linkage/`
   - 從訓練計劃任務創建練習會話
   - 自動任務狀態同步
   - 雙模式支持（任務模式/自由模式）
   - 任務完成流程引導

### 已實現但待歸檔的能力（在變更中定義）

3. **Training Plans (訓練計劃管理)** - `changes/add-interview-training-system/specs/training-plans/`
   - AI生成個性化訓練計劃
   - 計劃查看和調整
   - 每日任務管理
   - 計劃元數據管理

4. **Interview Practice (面試練習)** - `changes/add-interview-training-system/specs/interview-practice/`
   - 啟動練習會話
   - 文字問答模式
   - AI模擬面試官（待實現）
   - 題目生成和擴展
   - 會話管理（暫停/恢復）

5. **AI Feedback (AI反饋係統)** - `changes/add-interview-training-system/specs/ai-feedback/`
   - 語言質量分析
   - 內容深度評估
   - 弱點識別
   - 參考答案生成
   - 學校針對性建議
   - 進步追蹤反饋

6. **Progress Tracking (進度追蹤)** - `changes/add-interview-training-system/specs/progress-tracking/`
   - 會話歷史記錄
   - 進度統計和可視化
   - 弱點追蹤
   - 里程碑和成就
   - 進度報告生成
   - 數據導出

7. **School Profiles (學校特徵管理)** - `changes/add-interview-training-system/specs/school-profiles/`
   - 學校特徵數據模型
   - TOP學校數據錄入（SPCC, QC, LSC等）
   - 學校特徵查詢和應用
   - 學校特徵管理和對比

8. **System Settings (係統設置管理)** - `changes/add-interview-training-system/specs/system-settings/`
   - 基本設置管理（學生信息、目標學校）
   - AI API配置
   - 數據備份與恢復
   - 係統信息展示

### 已實現的額外功能

9. **Student Weaknesses Analysis (學生弱點分析)**
   - AI自動識別6種弱點類型
   - 弱點趨勢分析
   - 根據弱點生成針對性題目
   - 練習效果追蹤

10. **Interview Memory (面試回憶錄入)**
    - 批量錄入面試回憶
    - AI自動提取題目和弱點
    - 智能分類和標記

11. **Data Management (數據管理)**
    - 數據導出（JSON格式）
    - 數據導入和恢復
    - 種子數據初始化

## Development Philosophy

1. **先簡單後複雜**：MVP先做核心流程，再優化細節
2. **用戶至上**：功能設計圍繞學生和家長的實際需求
3. **數據積累**：設計數據結構時考慮未來分析和改進
4. **持續反饋**：收集使用反饋，快速迭代
5. **AI輔助**：充分利用AI能力，但保留人工干預空間
6. **規範驅動**：使用OpenSpec規範驅動開發，確保文檔與代碼同步
7. **性能優先**：關注頁面加載速度和API響應時間，持續優化
8. **文檔同步**：所有代碼變更必須更新相關文檔，確保文檔準確性
