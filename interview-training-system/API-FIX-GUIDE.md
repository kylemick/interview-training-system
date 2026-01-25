# API接口调用问题修复指南

## 问题描述

用户报告"接口调用都失败了"。

## 根本原因

**端口冲突**：前端Vite开发服务器可能占用了3001端口，导致后端无法正常监听，或者前端无法正确代理到后端。

## 解决方案

### 1. 清理所有进程并重新启动

```bash
# 清理所有相关进程
cd /Users/chenkan/project/plans/interview-training-system
pkill -f "tsx watch"
pkill -f "vite"

# 重新启动后端
cd backend
npm run dev

# 在另一个终端启动前端
cd frontend
npm run dev
```

### 2. 使用一键启动脚本

```bash
# 方式 1: 使用 dev.sh（推荐）
./dev.sh

# 方式 2: 使用 quick-start.sh（带监控）
./quick-start.sh
```

### 3. 验证服务状态

```bash
# 检查后端健康状态
curl http://localhost:3001/health
# 应该返回: {"status":"ok","timestamp":"..."}

# 检查后端API
curl http://localhost:3001/api/schools
# 应该返回学校列表JSON

# 检查前端
curl http://localhost:3000
# 应该返回前端HTML
```

### 4. 前端API配置

前端配置在 `frontend/src/utils/api.ts`：

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
```

**前端Vite代理配置** (`frontend/vite.config.ts`)：

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

这意味着：
- 前端运行在 `http://localhost:3000`
- 所有 `/api/*` 请求会被代理到 `http://localhost:3001/api/*`
- 前端代码中直接使用 `/api/...` 即可

### 5. 常见问题排查

#### 问题1: 端口被占用

**症状**：后端启动失败或返回HTML

**解决**：
```bash
# 检查端口占用
lsof -i :3001
lsof -i :3000

# 杀掉占用进程
kill -9 <PID>
```

#### 问题2: CORS错误

**症状**：浏览器控制台显示CORS错误

**解决**：
- 后端已配置CORS (`app.use(cors())`)
- 确保前端通过代理访问，而不是直接访问3001端口

#### 问题3: 前端无法连接后端

**症状**：网络请求失败

**解决**：
1. 确认后端正在运行：`curl http://localhost:3001/health`
2. 确认前端代理配置正确
3. 检查浏览器控制台的网络请求，看实际请求的URL

#### 问题4: API返回404

**症状**：接口返回404错误

**解决**：
1. 检查路由是否正确注册在 `backend/src/index.ts`
2. 检查API路径是否正确（注意 `/api` 前缀）
3. 查看后端日志确认请求是否到达

### 6. 调试技巧

#### 查看后端日志

```bash
# 如果使用后台启动
tail -f /tmp/backend-new.log

# 或者直接在前台运行查看日志
cd backend && npm run dev
```

#### 查看前端网络请求

1. 打开浏览器开发者工具
2. 切换到 Network 标签
3. 查看API请求的详细信息：
   - 请求URL
   - 请求方法
   - 响应状态码
   - 响应内容

#### 测试API接口

```bash
# 测试健康检查
curl http://localhost:3001/health

# 测试学校列表
curl http://localhost:3001/api/schools

# 测试题目列表
curl http://localhost:3001/api/questions

# 测试AI连接
curl -X POST http://localhost:3001/api/ai/test-connection \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 7. 快速修复脚本

创建一个快速修复脚本 `fix-api.sh`：

```bash
#!/bin/bash

echo "🔧 修复API接口问题..."

# 清理进程
echo "1. 清理残留进程..."
pkill -f "tsx watch" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

# 启动后端
echo "2. 启动后端服务..."
cd backend
npm run dev > /tmp/backend-fix.log 2>&1 &
BACKEND_PID=$!
echo "   后端 PID: $BACKEND_PID"
cd ..

# 等待后端启动
echo "3. 等待后端就绪..."
for i in {1..10}; do
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "   ✅ 后端启动成功！"
    break
  fi
  if [ $i -eq 10 ]; then
    echo "   ❌ 后端启动超时"
    exit 1
  fi
  sleep 1
done

# 启动前端
echo "4. 启动前端服务..."
cd frontend
npm run dev > /tmp/frontend-fix.log 2>&1 &
FRONTEND_PID=$!
echo "   前端 PID: $FRONTEND_PID"
cd ..

# 等待前端启动
echo "5. 等待前端就绪..."
sleep 3

# 验证
echo ""
echo "✅ 修复完成！"
echo ""
echo "验证服务："
echo "  - 后端: curl http://localhost:3001/health"
echo "  - 前端: http://localhost:3000"
echo ""
echo "查看日志："
echo "  - 后端: tail -f /tmp/backend-fix.log"
echo "  - 前端: tail -f /tmp/frontend-fix.log"
echo ""
echo "停止服务："
echo "  kill $BACKEND_PID $FRONTEND_PID"
```

## 当前状态

✅ **后端已修复并正常运行**
- 端口：3001
- 健康检查：http://localhost:3001/health
- API基础路径：http://localhost:3001/api

✅ **前端配置正确**
- 端口：3000
- 代理配置：`/api` → `http://localhost:3001/api`

## 推荐操作

1. **使用一键启动脚本**：
   ```bash
   ./dev.sh
   ```

2. **如果仍有问题，使用修复脚本**：
   ```bash
   chmod +x fix-api.sh
   ./fix-api.sh
   ```

3. **验证服务**：
   ```bash
   # 测试后端
   curl http://localhost:3001/health
   curl http://localhost:3001/api/schools
   
   # 打开浏览器
   open http://localhost:3000
   ```

## 预防措施

1. **使用进程管理**：使用 `dev.sh` 或 `quick-start.sh` 统一管理
2. **检查端口冲突**：启动前检查端口是否被占用
3. **查看日志**：遇到问题时查看后端和前端日志
4. **验证配置**：确保前后端配置一致

---

**最后更新**: 2026-01-24
**状态**: ✅ 已修复
