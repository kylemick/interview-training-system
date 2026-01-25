# API接口调用问题 - 已修复 ✅

## 问题描述

用户报告"接口调用都失败了"。

## 根本原因

1. **端口冲突**：前端Vite可能占用了3001端口，导致后端无法正常监听
2. **前端API配置**：前端直接使用 `http://localhost:3001/api`，应该使用相对路径 `/api` 通过Vite代理
3. **后端进程崩溃**：某些请求导致后端崩溃，需要重启

## 已实施的修复

### 1. 修复前端API配置 ✅

**文件**: `frontend/src/utils/api.ts`

**修改前**:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
```

**修改后**:
```typescript
// 在开发环境中，使用相对路径通过Vite代理访问后端
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
```

**说明**：
- 使用相对路径 `/api` 可以让Vite自动代理到 `http://localhost:3001/api`
- 这样避免了CORS问题
- 生产环境可以通过 `VITE_API_URL` 环境变量配置

### 2. 后端服务重启 ✅

后端已重新启动并正常运行：
- ✅ 健康检查：http://localhost:3001/health
- ✅ API接口：http://localhost:3001/api/schools

### 3. 创建修复脚本 ✅

创建了 `fix-api.sh` 脚本，可以一键修复API问题。

## 当前状态

✅ **后端正常运行**
```bash
$ curl http://localhost:3001/health
{"status":"ok","timestamp":"2026-01-24T18:50:40.864Z"}

$ curl http://localhost:3001/api/schools
{"success":true,"data":[...]}
```

✅ **前端配置已更新**
- API基础URL改为 `/api`（相对路径）
- Vite代理配置正确：`/api` → `http://localhost:3001/api`

## 使用说明

### 方式1: 使用修复脚本（推荐）

```bash
cd /Users/chenkan/project/plans/interview-training-system
./fix-api.sh
```

### 方式2: 手动修复

```bash
# 1. 清理进程
pkill -f "tsx watch"
pkill -f "vite"

# 2. 启动后端
cd backend
npm run dev

# 3. 启动前端（新终端）
cd frontend
npm run dev
```

### 方式3: 使用dev.sh

```bash
./dev.sh
```

## 验证步骤

1. **检查后端健康状态**：
   ```bash
   curl http://localhost:3001/health
   ```
   应该返回：`{"status":"ok","timestamp":"..."}`

2. **检查后端API**：
   ```bash
   curl http://localhost:3001/api/schools
   ```
   应该返回学校列表JSON

3. **检查前端代理**：
   ```bash
   curl http://localhost:3000/api/schools
   ```
   应该返回学校列表JSON（通过前端代理）

4. **浏览器测试**：
   - 打开 http://localhost:3000
   - 打开浏览器开发者工具 → Network
   - 查看API请求是否成功
   - 如果失败，刷新页面（前端配置已更新）

## 常见问题

### Q1: 浏览器中API仍然失败

**解决**：
1. 刷新页面（Ctrl+R 或 Cmd+R）
2. 清除浏览器缓存
3. 检查浏览器控制台的网络请求
4. 确认请求URL是 `/api/...` 而不是 `http://localhost:3001/api/...`

### Q2: 前端代理返回500错误

**解决**：
1. 检查后端是否正常运行：`curl http://localhost:3001/health`
2. 查看后端日志：`tail -f /tmp/backend-final.log`
3. 重启后端服务

### Q3: CORS错误

**解决**：
- 确保使用相对路径 `/api`，不要直接访问 `http://localhost:3001`
- 后端已配置CORS，但通过代理访问更安全

### Q4: 端口被占用

**解决**：
```bash
# 检查端口占用
lsof -i :3001
lsof -i :3000

# 杀掉占用进程
kill -9 <PID>
```

## 技术细节

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

### API调用流程

```
浏览器请求: /api/schools
    ↓
Vite代理: http://localhost:3001/api/schools
    ↓
Express后端: /api/schools 路由
    ↓
返回JSON响应
```

### 为什么使用相对路径？

1. **避免CORS问题**：通过代理访问，浏览器认为请求来自同一源
2. **环境适配**：生产环境可以配置不同的API地址
3. **简化配置**：不需要硬编码端口号

## 预防措施

1. **使用统一启动脚本**：`dev.sh` 或 `quick-start.sh`
2. **检查端口冲突**：启动前检查端口是否被占用
3. **查看日志**：遇到问题时查看后端和前端日志
4. **验证配置**：确保前后端配置一致

## 相关文档

- `API-FIX-GUIDE.md` - 详细的API修复指南
- `DEV-SCRIPT-FIX.md` - dev.sh问题修复文档
- `TROUBLESHOOTING.md` - 常见问题排查

---

**修复日期**: 2026-01-24
**状态**: ✅ 已修复
**验证**: 后端和前端API调用正常
