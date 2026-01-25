#!/bin/bash

# API接口修复脚本

echo "🔧 修复API接口问题..."
echo "================================"

# 进入项目目录
cd "$(dirname "$0")"

# 1. 清理进程
echo ""
echo "1️⃣ 清理残留进程..."
pkill -f "tsx watch" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2
echo "   ✅ 已清理"

# 2. 启动后端
echo ""
echo "2️⃣ 启动后端服务..."
cd backend
npm run dev > /tmp/backend-fix.log 2>&1 &
BACKEND_PID=$!
echo "   后端 PID: $BACKEND_PID"
cd ..

# 3. 等待后端启动
echo ""
echo "3️⃣ 等待后端就绪..."
for i in {1..15}; do
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "   ✅ 后端启动成功！"
    HEALTH_RESPONSE=$(curl -s http://localhost:3001/health)
    echo "   响应: $HEALTH_RESPONSE"
    break
  fi
  if [ $i -eq 15 ]; then
    echo "   ❌ 后端启动超时"
    echo "   查看日志: tail -20 /tmp/backend-fix.log"
    exit 1
  fi
  sleep 1
  echo -n "   ."
done

# 4. 测试后端API
echo ""
echo "4️⃣ 测试后端API..."
API_TEST=$(curl -s http://localhost:3001/api/schools | head -c 100)
if echo "$API_TEST" | grep -q "success"; then
  echo "   ✅ 后端API正常"
else
  echo "   ⚠️  后端API响应异常: $API_TEST"
fi

# 5. 启动前端
echo ""
echo "5️⃣ 启动前端服务..."
cd frontend
npm run dev > /tmp/frontend-fix.log 2>&1 &
FRONTEND_PID=$!
echo "   前端 PID: $FRONTEND_PID"
cd ..

# 6. 等待前端启动
echo ""
echo "6️⃣ 等待前端就绪..."
sleep 5

# 7. 测试前端代理
echo ""
echo "7️⃣ 测试前端代理..."
PROXY_TEST=$(curl -s http://localhost:3000/api/schools | head -c 100)
if echo "$PROXY_TEST" | grep -q "success"; then
  echo "   ✅ 前端代理正常"
else
  echo "   ⚠️  前端代理响应: $PROXY_TEST"
  echo "   提示: 前端可能需要刷新页面"
fi

# 8. 保存PID
echo "$BACKEND_PID" > /tmp/backend.pid
echo "$FRONTEND_PID" > /tmp/frontend.pid

# 9. 总结
echo ""
echo "================================"
echo "✅ 修复完成！"
echo "================================"
echo ""
echo "服务状态："
echo "  📡 后端: http://localhost:3001"
echo "  🌐 前端: http://localhost:3000"
echo ""
echo "验证命令："
echo "  curl http://localhost:3001/health"
echo "  curl http://localhost:3001/api/schools"
echo "  curl http://localhost:3000/api/schools"
echo ""
echo "查看日志："
echo "  tail -f /tmp/backend-fix.log"
echo "  tail -f /tmp/frontend-fix.log"
echo ""
echo "停止服务："
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  或: pkill -f 'tsx watch'; pkill -f vite"
echo ""
echo "💡 提示："
echo "  - 如果浏览器中API仍然失败，请刷新页面"
echo "  - 确保前端使用相对路径 /api（已自动配置）"
echo "  - 检查浏览器控制台的网络请求"
echo ""
