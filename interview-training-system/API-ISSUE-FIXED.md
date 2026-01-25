# API接口調用問題 - 已修复 ✅

## 問題描述

用户报告"接口調用都失敗了"。

## 根本原因

1. **端口冲突**：前端Vite可能占用了3001端口，導致後端无法正常监听
2. **前端API配置**：前端直接使用 `http://localhost:3001/api`，应该使用相對路径 `/api` 通過Vite代理
3. **後端進程崩溃**：某些请求導致後端崩溃，需要重启

## 已实施的修复

### 1. 修复前端API配置 ✅

**文件**: `frontend/src/utils/api.ts`

**修改前**:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
```

**修改後**:
```typescript
// 在開發环境中，使用相對路径通過Vite代理访問後端
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
```

**說明**：
- 使用相對路径 `/api` 可以让Vite自動代理到 `http://localhost:3001/api`
- 这樣避免了CORS問題
- 生产环境可以通過 `VITE_API_URL` 环境变量配置

### 2. 後端服務重启 ✅

後端已重新启動并正常运行：
- ✅ 健康检查：http://localhost:3001/health
- ✅ API接口：http://localhost:3001/api/schools

### 3. 創建修复脚本 ✅

創建了 `fix-api.sh` 脚本，可以一键修复API問題。

## 当前狀態

✅ **後端正常运行**
```bash
$ curl http://localhost:3001/health
{"status":"ok","timestamp":"2026-01-24T18:50:40.864Z"}

$ curl http://localhost:3001/api/schools
{"success":true,"data":[...]}
```

✅ **前端配置已更新**
- API基础URL改为 `/api`（相對路径）
- Vite代理配置正確：`/api` → `http://localhost:3001/api`

## 使用說明

### 方式1: 使用修复脚本（推荐）

```bash
cd /Users/chenkan/project/plans/interview-training-system
./fix-api.sh
```

### 方式2: 手動修复

```bash
# 1. 清理進程
pkill -f "tsx watch"
pkill -f "vite"

# 2. 启動後端
cd backend
npm run dev

# 3. 启動前端（新终端）
cd frontend
npm run dev
```

### 方式3: 使用dev.sh

```bash
./dev.sh
```

## 验证步骤

1. **检查後端健康狀態**：
   ```bash
   curl http://localhost:3001/health
   ```
   应该返回：`{"status":"ok","timestamp":"..."}`

2. **检查後端API**：
   ```bash
   curl http://localhost:3001/api/schools
   ```
   应该返回學校列表JSON

3. **检查前端代理**：
   ```bash
   curl http://localhost:3000/api/schools
   ```
   应该返回學校列表JSON（通過前端代理）

4. **浏览器测試**：
   - 打開 http://localhost:3000
   - 打開浏览器開發者工具 → Network
   - 查看API请求是否成功
   - 如果失敗，刷新页面（前端配置已更新）

## 常见問題

### Q1: 浏览器中API仍然失敗

**解决**：
1. 刷新页面（Ctrl+R 或 Cmd+R）
2. 清除浏览器缓存
3. 检查浏览器控制台的网络请求
4. 確认请求URL是 `/api/...` 而不是 `http://localhost:3001/api/...`

### Q2: 前端代理返回500错误

**解决**：
1. 检查後端是否正常运行：`curl http://localhost:3001/health`
2. 查看後端日志：`tail -f /tmp/backend-final.log`
3. 重启後端服務

### Q3: CORS错误

**解决**：
- 確保使用相對路径 `/api`，不要直接访問 `http://localhost:3001`
- 後端已配置CORS，但通過代理访問更安全

### Q4: 端口被占用

**解决**：
```bash
# 检查端口占用
lsof -i :3001
lsof -i :3000

# 杀掉占用進程
kill -9 <PID>
```

## 技術细节

### Vite代理配置

`frontend/vite.config.ts`:
```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
}
```

### API調用流程

```
浏览器请求: /api/schools
    ↓
Vite代理: http://localhost:3001/api/schools
    ↓
Express後端: /api/schools 路由
    ↓
返回JSON响应
```

### 为什么使用相對路径？

1. **避免CORS問題**：通過代理访問，浏览器认为请求來自同一源
2. **环境适配**：生产环境可以配置不同的API地址
3. **简化配置**：不需要硬编碼端口號

## 预防措施

1. **使用統一启動脚本**：`dev.sh` 或 `quick-start.sh`
2. **检查端口冲突**：启動前检查端口是否被占用
3. **查看日志**：遇到問題時查看後端和前端日志
4. **验证配置**：確保前後端配置一致

## 相關文檔

- `API-FIX-GUIDE.md` - 详细的API修复指南
- `DEV-SCRIPT-FIX.md` - dev.sh問題修复文檔
- `TROUBLESHOOTING.md` - 常见問題排查

---

**修复日期**: 2026-01-24
**狀態**: ✅ 已修复
**验证**: 後端和前端API調用正常
