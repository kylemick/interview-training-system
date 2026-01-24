#!/bin/bash

# GitHub CLI (gh) 安装脚本

echo "🚀 GitHub CLI 安装脚本"
echo "======================="
echo ""

# 检测操作系统
OS_TYPE=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS_TYPE="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS_TYPE="linux"
else
    echo "❌ 不支持的操作系统: $OSTYPE"
    exit 1
fi

echo "📋 操作系统: $OS_TYPE"
echo ""

# macOS 安装
if [ "$OS_TYPE" = "macos" ]; then
    echo "正在使用 Homebrew 安装 GitHub CLI..."
    echo ""
    
    # 修复 Homebrew 权限
    echo "🔧 修复 Homebrew 权限..."
    sudo chown -R $(whoami) /opt/homebrew /Users/$(whoami)/Library/Logs/Homebrew 2>/dev/null || true
    sudo chmod u+w /opt/homebrew /Users/$(whoami)/Library/Logs/Homebrew 2>/dev/null || true
    
    echo ""
    echo "📦 安装 gh..."
    brew install gh
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ GitHub CLI 安装成功！"
        echo ""
        gh --version
    else
        echo ""
        echo "❌ 安装失败，请尝试手动安装："
        echo "  1. 访问 https://github.com/cli/cli/releases"
        echo "  2. 下载 macOS 版本"
        echo "  3. 双击安装"
        exit 1
    fi
fi

# Linux 安装
if [ "$OS_TYPE" = "linux" ]; then
    echo "正在安装 GitHub CLI..."
    echo ""
    
    # 检测发行版
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        echo "📦 检测到 Debian/Ubuntu..."
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sudo apt update
        sudo apt install -y gh
    elif [ -f /etc/redhat-release ]; then
        # RHEL/CentOS/Fedora
        echo "📦 检测到 RHEL/CentOS/Fedora..."
        sudo dnf install -y 'dnf-command(config-manager)'
        sudo dnf config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
        sudo dnf install -y gh
    else
        echo "❌ 未知的 Linux 发行版"
        echo "请访问 https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
        exit 1
    fi
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ GitHub CLI 安装成功！"
        echo ""
        gh --version
    else
        echo ""
        echo "❌ 安装失败"
        exit 1
    fi
fi

echo ""
echo "======================="
echo "✨ 安装完成！"
echo ""
echo "下一步："
echo "  1. 登录 GitHub: gh auth login"
echo "  2. 创建仓库并推送代码"
echo ""
