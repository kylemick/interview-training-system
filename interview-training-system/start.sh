#!/bin/bash

# 升中面试训练系统 - 快速启动脚本

echo "🚀 启动升中面试训练系统..."
echo ""

# 检查 Node.js 版本
echo "📋 检查环境..."
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    echo "请安装 Node.js >= 18: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  警告: Node.js 版本过低 (当前: $(node -v), 需要: >= 18)"
fi

echo "✅ Node.js: $(node -v)"
echo "✅ npm: $(npm -v)"
echo ""

# 检查并创建 .env 文件
if [ ! -f "backend/.env" ]; then
    echo "📝 创建后端环境配置文件..."
    cp backend/.env.example backend/.env
    echo "⚠️  请编辑 backend/.env 文件，配置 DEEPSEEK_API_KEY"
    echo ""
fi

# 检查依赖是否已安装
if [ ! -d "backend/node_modules" ]; then
    echo "📦 安装后端依赖..."
    cd backend && npm install && cd ..
    echo ""
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 安装前端依赖..."
    cd frontend && npm install && cd ..
    echo ""
fi

echo "✅ 依赖检查完成"
echo ""

# 初始化数据库
echo "🗄️  初始化数据库..."
cd backend && npm run db:init && cd ..
echo ""

echo "================================================"
echo "✨ 准备就绪！"
echo "================================================"
echo ""
echo "请在两个终端窗口中分别运行："
echo ""
echo "终端1 - 启动后端:"
echo "  cd backend && npm run dev"
echo ""
echo "终端2 - 启动前端:"
echo "  cd frontend && npm run dev"
echo ""
echo "然后访问: http://localhost:3000"
echo ""
