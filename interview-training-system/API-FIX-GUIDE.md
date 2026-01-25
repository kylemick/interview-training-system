# API接口調用問題修复指南

## 問題描述

用户报告"接口調用都失敗了"。

## 根本原因

**端口冲突**：前端Vite開發服務器可能占用了3001端口，導致後端无法正常监听，或者前端无法正確代理到後端。

## 解决方案

### 1. 清理所有進程并重新启動

```bash
# 清理所有相關進程
cd /Users/chenkan/project/plans/interview-training-system
pkill -f "tsx watch"
pkill -f "vite"

# 重新启動後端
cd backend
npm run dev

# 在另一个终端启動前端
cd frontend
npm run dev
```

### 2. 使用一键启動脚本

```bash
# 方式 1: 使用 dev.sh（推荐）
./dev.sh

# 方式 2: 使用 quick-start.sh（带监控）
./quick-start.sh
```

### 3. 验证服務狀態

```bash
# 检查後端健康狀態
curl http://localhost:3001/health
# 应该返回: {"status":"ok","timestamp":"..."}

# 检查後端API
curl http://localhost:3001/api/schools
# 应该返回學校列表JSON

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
- 所有 `/api/*` 请求會被代理到 `http://localhost:3001/api/*`
- 前端代碼中直接使用 `/api/...` 即可

### 5. 常见問題排查

#### 問題1: 端口被占用

**症狀**：後端启動失敗或返回HTML

**解决**：
```bash
# 检查端口占用
lsof -i :3001
lsof -i :3000

# 杀掉占用進程
kill -9 <PID>
```

#### 問題2: CORS错误

**症狀**：浏览器控制台显示CORS错误

**解决**：
- 後端已配置CORS (`app.use(cors())`)
- 確保前端通過代理访問，而不是直接访問3001端口

#### 問題3: 前端无法连接後端

**症狀**：网络请求失敗

**解决**：
1. 確认後端正在运行：`curl http://localhost:3001/health`
2. 確认前端代理配置正確
3. 检查浏览器控制台的网络请求，看实际请求的URL

#### 問題4: API返回404

**症狀**：接口返回404错误

**解决**：
1. 检查路由是否正確注册在 `backend/src/index.ts`
2. 检查API路径是否正確（注意 `/api` 前缀）
3. 查看後端日志確认请求是否到達

### 6. 調試技巧

#### 查看後端日志

```bash
# 如果使用後台启動
tail -f /tmp/backend-new.log

# 或者直接在前台运行查看日志
cd backend && npm run dev
```

#### 查看前端网络请求

1. 打開浏览器開發者工具
2. 切换到 Network 標籤
3. 查看API请求的详细信息：
   - 请求URL
   - 请求方法
   - 响应狀態碼
   - 响应內容

#### 测試API接口

```bash
# 测試健康检查
curl http://localhost:3001/health

# 测試學校列表
curl http://localhost:3001/api/schools

# 测試題目列表
curl http://localhost:3001/api/questions

# 测試AI连接
curl -X POST http://localhost:3001/api/ai/test-connection \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 7. 快速修复脚本

創建一个快速修复脚本 `fix-api.sh`：

```bash
#!/bin/bash

echo "🔧 修复API接口問題..."

# 清理進程
echo "1. 清理残留進程..."
pkill -f "tsx watch" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

# 启動後端
echo "2. 启動後端服務..."
cd backend
npm run dev > /tmp/backend-fix.log 2>&1 &
BACKEND_PID=$!
echo "   後端 PID: $BACKEND_PID"
cd ..

# 等待後端启動
echo "3. 等待後端就绪..."
for i in {1..10}; do
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "   ✅ 後端启動成功！"
    break
  fi
  if [ $i -eq 10 ]; then
    echo "   ❌ 後端启動超時"
    exit 1
  fi
  sleep 1
done

# 启動前端
echo "4. 启動前端服務..."
cd frontend
npm run dev > /tmp/frontend-fix.log 2>&1 &
FRONTEND_PID=$!
echo "   前端 PID: $FRONTEND_PID"
cd ..

# 等待前端启動
echo "5. 等待前端就绪..."
sleep 3

# 验证
echo ""
echo "✅ 修复完成！"
echo ""
echo "验证服務："
echo "  - 後端: curl http://localhost:3001/health"
echo "  - 前端: http://localhost:3000"
echo ""
echo "查看日志："
echo "  - 後端: tail -f /tmp/backend-fix.log"
echo "  - 前端: tail -f /tmp/frontend-fix.log"
echo ""
echo "停止服務："
echo "  kill $BACKEND_PID $FRONTEND_PID"
```

## 当前狀態

✅ **後端已修复并正常运行**
- 端口：3001
- 健康检查：http://localhost:3001/health
- API基础路径：http://localhost:3001/api

✅ **前端配置正確**
- 端口：3000
- 代理配置：`/api` → `http://localhost:3001/api`

## 推荐操作

1. **使用一键启動脚本**：
   ```bash
   ./dev.sh
   ```

2. **如果仍有問題，使用修复脚本**：
   ```bash
   chmod +x fix-api.sh
   ./fix-api.sh
   ```

3. **验证服務**：
   ```bash
   # 测試後端
   curl http://localhost:3001/health
   curl http://localhost:3001/api/schools
   
   # 打開浏览器
   open http://localhost:3000
   ```

## 预防措施

1. **使用進程管理**：使用 `dev.sh` 或 `quick-start.sh` 統一管理
2. **检查端口冲突**：启動前检查端口是否被占用
3. **查看日志**：遇到問題時查看後端和前端日志
4. **验证配置**：確保前後端配置一致

---

**最後更新**: 2026-01-24
**狀態**: ✅ 已修复
