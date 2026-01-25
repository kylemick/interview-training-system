#!/bin/bash

# 测试 dev.sh 脚本
# 检查后端是否正常启动

echo "🧪 测试 dev.sh 启动脚本"
echo "================================"

# 1. 检查后端进程
echo ""
echo "1️⃣ 检查后端进程..."
if pgrep -f "tsx watch src/index.ts" > /dev/null; then
    echo "✅ 后端进程运行中 (PID: $(pgrep -f 'tsx watch src/index.ts'))"
else
    echo "❌ 后端进程未运行"
    exit 1
fi

# 2. 检查后端端口
echo ""
echo "2️⃣ 检查后端端口 3001..."
if lsof -i :3001 > /dev/null 2>&1; then
    echo "✅ 端口 3001 正在监听"
else
    echo "❌ 端口 3001 未监听"
    exit 1
fi

# 3. 检查健康接口
echo ""
echo "3️⃣ 检查健康接口..."
HEALTH=$(curl -s http://localhost:3001/health)
if echo "$HEALTH" | grep -q "ok"; then
    echo "✅ 健康检查通过"
    echo "   响应: $HEALTH"
else
    echo "❌ 健康检查失败"
    echo "   响应: $HEALTH"
    exit 1
fi

# 4. 检查数据库连接
echo ""
echo "4️⃣ 检查数据库连接..."
DB_TEST=$(curl -s http://localhost:3001/api/schools)
if echo "$DB_TEST" | grep -q "success"; then
    echo "✅ 数据库连接正常"
else
    echo "⚠️  数据库查询异常（可能是空数据）"
    echo "   响应: $(echo $DB_TEST | head -c 100)"
fi

# 5. 检查前端进程（如果有）
echo ""
echo "5️⃣ 检查前端进程..."
if pgrep -f "vite.*frontend" > /dev/null; then
    echo "✅ 前端进程运行中 (PID: $(pgrep -f 'vite.*frontend'))"
    
    # 检查前端端口
    if lsof -i :3000 > /dev/null 2>&1; then
        echo "✅ 前端端口 3000 正在监听"
    elif lsof -i :5173 > /dev/null 2>&1; then
        echo "✅ 前端端口 5173 正在监听"
    else
        echo "⚠️  前端端口未监听（可能还在启动中）"
    fi
else
    echo "ℹ️  前端进程未运行（可能需要单独启动）"
fi

echo ""
echo "================================"
echo "✅ 测试完成！后端运行正常"
echo ""
echo "访问地址："
echo "  - 后端: http://localhost:3001"
echo "  - 前端: http://localhost:5173"
echo "  - 健康检查: http://localhost:3001/health"
echo ""
