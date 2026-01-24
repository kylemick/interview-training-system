#!/bin/bash

# 升中面试训练系统 - 一键安装脚本
# 自动安装 MySQL、配置环境、初始化数据库

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

clear
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║         升中面试训练系统 - 一键安装向导                    ║"
echo "║                                                           ║"
echo "║    本脚本将帮助您完成以下操作：                            ║"
echo "║    ✓ 检查并安装 MySQL                                    ║"
echo "║    ✓ 配置环境变量                                        ║"
echo "║    ✓ 创建数据库                                          ║"
echo "║    ✓ 安装项目依赖                                        ║"
echo "║    ✓ 启动应用                                            ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# ============================================================
# 步骤 1: 检查操作系统
# ============================================================
echo -e "${BLUE}[步骤 1/6] 检查操作系统...${NC}"
OS_TYPE=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS_TYPE="macos"
    echo -e "${GREEN}✓ 检测到 macOS${NC}"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS_TYPE="linux"
    echo -e "${GREEN}✓ 检测到 Linux${NC}"
else
    echo -e "${RED}✗ 不支持的操作系统: $OSTYPE${NC}"
    echo "请在 macOS 或 Linux 上运行此脚本"
    exit 1
fi
echo ""

# ============================================================
# 步骤 2: 检查并安装 MySQL
# ============================================================
echo -e "${BLUE}[步骤 2/6] 检查 MySQL...${NC}"

MYSQL_INSTALLED=false
MYSQL_PASSWORD=""
MYSQL_NEW_INSTALL=false

if command -v mysql &> /dev/null; then
    echo -e "${GREEN}✓ MySQL 已安装${NC}"
    mysql --version
    MYSQL_INSTALLED=true
else
    echo -e "${YELLOW}⚠ MySQL 未安装${NC}"
    echo ""
    read -p "是否现在安装 MySQL? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ "$OS_TYPE" = "macos" ]; then
            echo -e "${CYAN}正在使用 Homebrew 安装 MySQL...${NC}"
            if ! command -v brew &> /dev/null; then
                echo -e "${RED}✗ 未检测到 Homebrew${NC}"
                echo "请先安装 Homebrew: https://brew.sh"
                exit 1
            fi
            brew install mysql
            echo -e "${CYAN}启动 MySQL 服务...${NC}"
            brew services start mysql
            MYSQL_NEW_INSTALL=true
            sleep 3
        elif [ "$OS_TYPE" = "linux" ]; then
            echo -e "${CYAN}正在安装 MySQL...${NC}"
            sudo apt update
            sudo apt install -y mysql-server
            echo -e "${CYAN}启动 MySQL 服务...${NC}"
            sudo systemctl start mysql
            sudo systemctl enable mysql
            MYSQL_NEW_INSTALL=true
            sleep 3
        fi
        echo -e "${GREEN}✓ MySQL 安装完成${NC}"
        MYSQL_INSTALLED=true
    else
        echo -e "${RED}✗ 安装已取消${NC}"
        echo "请手动安装 MySQL 后重新运行此脚本"
        exit 1
    fi
fi
echo ""

# ============================================================
# 步骤 3: 配置 MySQL 密码
# ============================================================
echo -e "${BLUE}[步骤 3/6] 配置 MySQL...${NC}"

if [ "$MYSQL_NEW_INSTALL" = true ]; then
    echo -e "${YELLOW}检测到 MySQL 是新安装的${NC}"
    echo "需要为 root 用户设置密码"
    echo ""
    
    while true; do
        read -sp "请输入 MySQL root 密码（用于本项目）: " MYSQL_PASSWORD
        echo
        read -sp "请再次输入密码确认: " MYSQL_PASSWORD_CONFIRM
        echo
        
        if [ "$MYSQL_PASSWORD" = "$MYSQL_PASSWORD_CONFIRM" ]; then
            if [ -z "$MYSQL_PASSWORD" ]; then
                echo -e "${YELLOW}⚠ 密码不能为空，请重新输入${NC}"
            else
                break
            fi
        else
            echo -e "${YELLOW}⚠ 两次密码不一致，请重新输入${NC}"
        fi
    done
    
    # 设置 MySQL root 密码
    echo -e "${CYAN}正在设置 MySQL root 密码...${NC}"
    if [ "$OS_TYPE" = "macos" ]; then
        mysql -u root <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED BY '$MYSQL_PASSWORD';
FLUSH PRIVILEGES;
EOF
    elif [ "$OS_TYPE" = "linux" ]; then
        sudo mysql -u root <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_PASSWORD';
FLUSH PRIVILEGES;
EOF
    fi
    echo -e "${GREEN}✓ 密码设置完成${NC}"
else
    echo "请输入现有的 MySQL root 密码"
    echo -e "${YELLOW}提示：如果首次安装 MySQL 且未设置密码，密码可能为空（直接回车）${NC}"
    while true; do
        read -sp "MySQL root 密码: " MYSQL_PASSWORD
        echo
        
        # 测试密码是否正确
        if mysql -u root -p"$MYSQL_PASSWORD" -e "SELECT 1;" &> /dev/null; then
            echo -e "${GREEN}✓ 密码验证成功${NC}"
            break
        else
            echo -e "${RED}✗ 密码错误，请重试${NC}"
        fi
    done
fi
echo ""

# ============================================================
# 步骤 4: 配置 DeepSeek API Key
# ============================================================
echo -e "${BLUE}[步骤 4/6] 配置 DeepSeek API...${NC}"
echo "DeepSeek API 用于 AI 功能（训练计划生成、题目生成、反馈分析）"
echo -e "${YELLOW}提示：如果暂时没有 API Key，可以留空，之后再配置${NC}"
echo ""

read -p "请输入 DeepSeek API Key（可留空）: " DEEPSEEK_API_KEY
echo ""

if [ -z "$DEEPSEEK_API_KEY" ]; then
    DEEPSEEK_API_KEY="your_deepseek_api_key_here"
    echo -e "${YELLOW}⚠ 未设置 API Key，AI 功能将无法使用${NC}"
    echo -e "${YELLOW}  稍后可编辑 backend/.env 文件添加${NC}"
else
    echo -e "${GREEN}✓ API Key 已设置${NC}"
fi
echo ""

# ============================================================
# 步骤 5: 创建 .env 配置文件
# ============================================================
echo -e "${BLUE}[步骤 5/6] 创建环境配置文件...${NC}"

ENV_FILE="$SCRIPT_DIR/backend/.env"

cat > "$ENV_FILE" <<EOF
# 后端服务器配置
PORT=3001

# DeepSeek API 配置
DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY
DEEPSEEK_API_URL=https://api.deepseek.com

# MySQL 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=$MYSQL_PASSWORD
DB_DATABASE=interview_training
DB_CONNECTION_LIMIT=10
EOF

echo -e "${GREEN}✓ 环境配置文件已创建: backend/.env${NC}"
echo ""

# ============================================================
# 步骤 6: 安装依赖和初始化
# ============================================================
echo -e "${BLUE}[步骤 6/6] 安装依赖并初始化数据库...${NC}"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ 未检测到 Node.js${NC}"
    echo "请先安装 Node.js >= 18: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
echo -e "${GREEN}✓ Node.js: $(node -v)${NC}"
echo -e "${GREEN}✓ npm: $(npm -v)${NC}"

if [ "$NODE_VERSION" -ge 23 ]; then
    echo -e "${YELLOW}⚠ 注意：你使用的是 Node.js v$NODE_VERSION${NC}"
    echo -e "${YELLOW}  推荐使用 v18 或 v20 LTS 以获得最佳兼容性${NC}"
fi
echo ""

# 安装根目录依赖
echo -e "${CYAN}正在安装启动工具...${NC}"
npm install --silent
echo ""

# 安装后端依赖
echo -e "${CYAN}正在安装后端依赖...${NC}"
cd "$SCRIPT_DIR/backend"
npm install --silent
echo ""

# 安装前端依赖
echo -e "${CYAN}正在安装前端依赖...${NC}"
cd "$SCRIPT_DIR/frontend"
npm install --silent
echo ""

# 初始化数据库
cd "$SCRIPT_DIR"
echo -e "${CYAN}正在初始化数据库...${NC}"
npm run db:init

echo ""
echo -e "${GREEN}✓ 所有依赖安装完成${NC}"
echo ""

# ============================================================
# 完成提示
# ============================================================
clear
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║              ✨ 安装完成！系统已准备就绪 ✨                 ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

echo -e "${CYAN}📋 配置信息：${NC}"
echo "  - MySQL 数据库: interview_training"
echo "  - MySQL 用户: root"
echo "  - 后端端口: 3001"
echo "  - 前端端口: 3000"
if [ "$DEEPSEEK_API_KEY" = "your_deepseek_api_key_here" ]; then
    echo -e "  - DeepSeek API: ${YELLOW}未配置（AI 功能不可用）${NC}"
else
    echo -e "  - DeepSeek API: ${GREEN}已配置${NC}"
fi
echo ""

echo -e "${CYAN}🚀 启动应用：${NC}"
echo "  ./dev.sh"
echo ""

echo -e "${CYAN}📚 访问地址：${NC}"
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:3001"
echo ""

echo -e "${CYAN}⚙️ 配置文件位置：${NC}"
echo "  backend/.env"
echo ""

if [ "$DEEPSEEK_API_KEY" = "your_deepseek_api_key_here" ]; then
    echo -e "${YELLOW}💡 提示：如需启用 AI 功能，请编辑 backend/.env 添加 DEEPSEEK_API_KEY${NC}"
    echo ""
fi

read -p "是否现在启动应用? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${GREEN}正在启动...${NC}"
    echo ""
    sleep 1
    ./dev.sh
else
    echo ""
    echo -e "${YELLOW}稍后运行 ./dev.sh 启动应用${NC}"
    echo ""
fi
