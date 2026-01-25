#!/bin/bash

# 快速启动脚本 - 确保所有服务正常运行

set -e

echo "🚀 快速启动升中面试训练系统"
echo "================================"
echo ""

# 进入项目目录
cd "$(dirname "$0")"

# 1. 清理残留进程
echo "🧹 清理残留进程..."
pkill -f "tsx watch src/index.ts" 2>/dev/null || true
pkill -f "vite.*frontend" 2>/dev/null || true
sleep 1

# 2. 启动后端
echo "📡 启动后端服务..."
cd backend
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "   后端 PID: $BACKEND_PID"
cd ..

# 3. 等待后端启动
echo "⏳ 等待后端就绪..."
for i in {1..10}; do
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ 后端启动成功！"
    break
  fi
  if [ $i -eq 10 ]; then
    echo "❌ 后端启动超时"
    echo "查看日志: tail -f /tmp/backend.log"
    exit 1
  fi
  sleep 1
done

# 4. 启动前端
echo "🎨 启动前端服务..."
cd frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   前端 PID: $FRONTEND_PID"
cd ..

# 5. 等待前端启动
echo "⏳ 等待前端就绪..."
sleep 3

echo ""
echo "================================"
echo "✅ 启动完成！"
echo "================================"
echo ""
echo "访问地址："
echo "  🌐 前端: http://localhost:5173"
echo "  📡 后端: http://localhost:3001"
echo "  💚 健康检查: http://localhost:3001/health"
echo ""
echo "查看日志："
echo "  📋 后端: tail -f /tmp/backend.log"
echo "  📋 前端: tail -f /tmp/frontend.log"
echo ""
echo "停止服务："
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  或者运行: pkill -f 'tsx watch'; pkill -f vite"
echo ""
echo "进程 ID 已保存到："
echo "  echo $BACKEND_PID > /tmp/backend.pid"
echo "  echo $FRONTEND_PID > /tmp/frontend.pid"
echo ""

# 保存 PID
echo $BACKEND_PID > /tmp/backend.pid
echo $FRONTEND_PID > /tmp/frontend.pid

# 等待用户中断
echo "按 Ctrl+C 停止所有服务..."
echo ""

# 捕获退出信号
trap 'echo ""; echo "🛑 停止服务..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo "✅ 已停止"; exit 0' INT TERM

# 持续显示状态
while true; do
  if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "⚠️  后端进程意外退出！"
    echo "查看日志: tail -20 /tmp/backend.log"
    exit 1
  fi
  sleep 5
done
