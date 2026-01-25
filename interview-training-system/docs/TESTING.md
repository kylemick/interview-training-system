# 测試指南

## 快速测試

### 1. 一键启動（推荐）

```bash
cd /Users/chenkan/project/plans/interview-training-system
./start.sh
```

脚本會自動：
- ✅ 检查 Node.js 版本
- ✅ 安装依赖
- ✅ 創建 .env 文件
- ✅ 初始化數據庫

### 2. 手動启動

#### 步骤1：安装依赖

```bash
# 前端
cd frontend
npm install

# 後端
cd ../backend
npm install
```

#### 步骤2：配置环境变量

```bash
# 复制配置模板
cp backend/.env.example backend/.env

# 编輯配置文件（可選，暫時可以不配置API key）
nano backend/.env
```

#### 步骤3：初始化數據庫

```bash
cd backend
npm run db:init
```

你应该看到類似输出：
```
📦 Initializing database...
✅ Database initialized successfully
Database stats: { school_profiles: 0, questions: 0, ... }
```

#### 步骤4：启動後端

```bash
cd backend
npm run dev
```

成功启動後會显示：
```
🚀 Server running on http://localhost:3001
📝 Health check: http://localhost:3001/health
📊 Database stats: ...
```

#### 步骤5：启動前端（新终端窗口）

```bash
cd frontend
npm run dev
```

成功启動後會显示：
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

## 测試检查清单

### ✅ 後端测試

1. **健康检查**
```bash
curl http://localhost:3001/health
```
预期输出：
```json
{"status":"ok","timestamp":"2026-01-24T..."}
```

2. **API端點测試**
```bash
# 學校API
curl http://localhost:3001/api/schools

# 題庫API
curl http://localhost:3001/api/questions

# 計劃API
curl http://localhost:3001/api/plans
```

3. **數據庫测試**
```bash
cd backend
npm run db:init
```
检查 `data/interview.db` 文件是否創建

4. **DeepSeek API测試（需要配置API key）**
```bash
cd backend
npm run test:api
```

### ✅ 前端测試

1. **访問主页**
   - 打開浏览器访問：http://localhost:3000
   - 应该看到"📚 升中面試訓練係統"標題
   - 左侧導航栏应该显示7个菜单項

2. **導航测試**
   點击每个菜单項，確认页面切换正常：
   - ✅ 仪表盘 (/)
   - ✅ 訓練計劃 (/plan)
   - ✅ 開始練習 (/practice)
   - ✅ 查看反馈 (/feedback)
   - ✅ 進度报告 (/progress)
   - ✅ 面試回憶 (/memory)
   - ✅ 设置 (/settings)

3. **開發者工具检查**
   - 打開浏览器開發者工具（F12）
   - Console標籤应该没有错误
   - Network標籤检查API調用

## 常见問題排查

### 問題1：端口被占用

**错误**：`Error: listen EADDRINUSE: address already in use :::3001`

**解决**：
```bash
# 查找占用端口的進程
lsof -i :3001

# 杀死進程
kill -9 <PID>
```

### 問題2：依赖安装失敗

**错误**：`npm install` 报错

**解决**：
```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 問題3：數據庫文件权限

**错误**：`SQLITE_CANTOPEN: unable to open database file`

**解决**：
```bash
# 確保data目錄存在且有写权限
mkdir -p data
chmod 755 data
```

### 問題4：TypeScript 编译错误

**错误**：TypeScript 類型错误

**解决**：
```bash
# 检查 TypeScript 版本
npm list typescript

# 重新安装
npm install --save-dev typescript@latest
```

### 問題5：前端代理不工作

**错误**：前端无法調用後端API

**解决**：
1. 確认後端已启動在 http://localhost:3001
2. 检查 `frontend/vite.config.ts` 中的 proxy 配置
3. 重启前端開發服務器

## 验证成功標準

### ✅ 後端成功標準

- [ ] 服務器启動在 http://localhost:3001
- [ ] `/health` 端點返回 200 狀態碼
- [ ] 數據庫文件 `data/interview.db` 已創建
- [ ] 所有表已創建（9张表）
- [ ] 无错误日志

### ✅ 前端成功標準

- [ ] 应用启動在 http://localhost:3000
- [ ] 页面正常加载，无白屏
- [ ] 導航栏显示正常
- [ ] 所有页面可以访問
- [ ] 開發者工具无错误

### ✅ 集成成功標準

- [ ] 前端可以访問後端API
- [ ] 浏览器 Network 標籤显示 API 調用成功
- [ ] 跨域（CORS）正常工作

## 下一步

测試通過後，可以開始：
1. 錄入學校數據（SPCC、QC、LSC）
2. 添加種子題目
3. 实现具体功能模块

## 性能基準

首次启動预期時間：
- 後端启動：< 2秒
- 前端启動：< 5秒
- 數據庫初始化：< 1秒
- API响应時間：< 100ms（不含AI調用）

## 获取帮助

如果遇到問題：
1. 查看终端的错误日志
2. 检查 `backend/.env` 配置
3. 確认 Node.js 版本 >= 18
4. 參考 [開發文檔](./DEVELOPMENT.md)
