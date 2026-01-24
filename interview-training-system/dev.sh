#!/bin/bash

# 升中面试训练系统 - 一键启动脚本
# 可以同时看到前后端的日志

set -e  # 遇到错误立即退出

echo "🚀 升中面试训练系统 - 一键启动"
echo "================================"
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查 Node.js
echo -e "${BLUE}📋 检查环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未安装 Node.js${NC}"
    echo "请安装 Node.js >= 18: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}⚠️  警告: Node.js 版本过低 (当前: $(node -v), 需要: >= 18)${NC}"
fi

# 检查 Node.js 版本
if [ "$NODE_VERSION" -ge 23 ]; then
    echo -e "${YELLOW}⚠️  警告: Node.js v$NODE_VERSION 是较新版本${NC}"
    echo -e "${YELLOW}   建议使用 Node.js v18 或 v20 LTS 版本${NC}"
    echo -e "${YELLOW}   或者确保已安装 Xcode Command Line Tools: xcode-select --install${NC}"
    echo ""
fi

echo -e "${GREEN}✅ Node.js: $(node -v)${NC}"
echo -e "${GREEN}✅ npm: $(npm -v)${NC}"
echo ""

# 检查 Xcode Command Line Tools（macOS）
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! xcode-select -p &> /dev/null; then
        echo -e "${YELLOW}⚠️  未检测到 Xcode Command Line Tools${NC}"
        echo -e "${YELLOW}   某些原生模块可能需要此工具进行编译${NC}"
        echo ""
        read -p "是否现在安装 Xcode Command Line Tools? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            xcode-select --install
            echo -e "${YELLOW}   请等待安装完成后重新运行此脚本${NC}"
            exit 0
        else
            echo -e "${YELLOW}   跳过安装，如果遇到编译错误请手动运行: xcode-select --install${NC}"
            echo ""
        fi
    fi
fi

# 检查并创建 .env 文件
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}📝 创建后端环境配置文件...${NC}"
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}⚠️  请编辑 backend/.env 文件，配置 DEEPSEEK_API_KEY（可选）${NC}"
    echo ""
fi

# 检查根目录依赖
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 安装启动工具...${NC}"
    npm install || {
        echo -e "${RED}❌ 启动工具安装失败${NC}"
        exit 1
    }
    echo ""
fi

# 检查后端依赖
if [ ! -d "backend/node_modules" ]; then
    echo -e "${BLUE}📦 安装后端依赖（这可能需要几分钟）...${NC}"
    cd "$SCRIPT_DIR/backend"
    npm install || {
        echo -e "${RED}❌ 后端依赖安装失败${NC}"
        echo -e "${YELLOW}如果遇到编译错误，请尝试：${NC}"
        echo -e "${YELLOW}1. 安装 Xcode Command Line Tools: xcode-select --install${NC}"
        echo -e "${YELLOW}2. 使用 Node.js LTS 版本 (v18 或 v20)${NC}"
        echo -e "${YELLOW}3. 查看完整日志: cat ~/.npm/_logs/*-debug-*.log${NC}"
        cd "$SCRIPT_DIR"
        exit 1
    }
    cd "$SCRIPT_DIR"
    echo ""
fi

# 检查前端依赖
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${BLUE}📦 安装前端依赖...${NC}"
    cd "$SCRIPT_DIR/frontend"
    npm install || {
        echo -e "${RED}❌ 前端依赖安装失败${NC}"
        cd "$SCRIPT_DIR"
        exit 1
    }
    cd "$SCRIPT_DIR"
    echo ""
fi

# 初始化数据库（如果不存在）
if [ ! -f "data/interview.db" ]; then
    echo -e "${BLUE}🗄️  初始化数据库...${NC}"
    npm run db:init || {
        echo -e "${YELLOW}⚠️  数据库初始化失败，将在首次启动时自动初始化${NC}"
    }
    echo ""
fi

echo "================================"
echo -e "${GREEN}✨ 启动应用...${NC}"
echo "================================"
echo ""
echo -e "${YELLOW}提示：${NC}"
echo "  - 后端运行在: http://localhost:3001"
echo "  - 前端运行在: http://localhost:3000"
echo "  - 按 Ctrl+C 停止所有服务"
echo ""
echo "================================"
echo ""

# 启动前后端（使用 concurrently 同时显示日志）
npm run dev
