@echo off
REM 升中面试训练系统 - Windows 一键安装脚本
chcp 65001 >nul

color 0B
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║         升中面试训练系统 - 一键安装向导 (Windows)          ║
echo ║                                                           ║
echo ║    本脚本将帮助您完成以下操作：                            ║
echo ║    ✓ 检查 MySQL 安装状态                                 ║
echo ║    ✓ 配置环境变量                                        ║
echo ║    ✓ 创建数据库                                          ║
echo ║    ✓ 安装项目依赖                                        ║
echo ║    ✓ 启动应用                                            ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
color 07

REM ============================================================
REM 步骤 1: 检查 MySQL
REM ============================================================
echo [步骤 1/5] 检查 MySQL...
echo.

where mysql >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo ✗ 未检测到 MySQL
    echo.
    echo 请先安装 MySQL:
    echo 1. 下载 MySQL Installer: https://dev.mysql.com/downloads/installer/
    echo 2. 选择 "Developer Default" 安装
    echo 3. 记住设置的 root 密码
    echo 4. 重新运行此脚本
    echo.
    pause
    exit /b 1
) else (
    color 0A
    echo ✓ MySQL 已安装
    mysql --version
    color 07
)
echo.

REM ============================================================
REM 步骤 2: 输入 MySQL 密码
REM ============================================================
echo [步骤 2/5] 配置 MySQL...
echo.
echo 请输入 MySQL root 密码
echo 提示：如果刚安装 MySQL，输入安装时设置的密码
echo.

set /p MYSQL_PASSWORD="MySQL root 密码: "
echo.

REM 测试密码
mysql -u root -p%MYSQL_PASSWORD% -e "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo ✗ 密码错误或 MySQL 服务未启动
    echo.
    echo 请检查：
    echo 1. MySQL 服务是否已启动（在"服务"中查看 MySQL80）
    echo 2. 密码是否正确
    echo.
    pause
    exit /b 1
) else (
    color 0A
    echo ✓ 密码验证成功
    color 07
)
echo.

REM ============================================================
REM 步骤 3: 配置 DeepSeek API Key
REM ============================================================
echo [步骤 3/5] 配置 DeepSeek API...
echo.
echo DeepSeek API 用于 AI 功能（训练计划生成、题目生成、反馈分析）
echo 提示：如果暂时没有 API Key，可以留空，之后再配置
echo.

set /p DEEPSEEK_API_KEY="请输入 DeepSeek API Key（可留空）: "
echo.

if "%DEEPSEEK_API_KEY%"=="" (
    set DEEPSEEK_API_KEY=your_deepseek_api_key_here
    color 0E
    echo ⚠ 未设置 API Key，AI 功能将无法使用
    echo   稍后可编辑 backend\.env 文件添加
    color 07
) else (
    color 0A
    echo ✓ API Key 已设置
    color 07
)
echo.

REM ============================================================
REM 步骤 4: 创建 .env 配置文件
REM ============================================================
echo [步骤 4/5] 创建环境配置文件...
echo.

(
echo # 后端服务器配置
echo PORT=3001
echo.
echo # DeepSeek API 配置
echo DEEPSEEK_API_KEY=%DEEPSEEK_API_KEY%
echo DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
echo.
echo # MySQL 数据库配置
echo DB_HOST=localhost
echo DB_PORT=3306
echo DB_USER=root
echo DB_PASSWORD=%MYSQL_PASSWORD%
echo DB_DATABASE=interview_training
echo DB_CONNECTION_LIMIT=10
) > backend\.env

color 0A
echo ✓ 环境配置文件已创建: backend\.env
color 07
echo.

REM ============================================================
REM 步骤 5: 安装依赖和初始化
REM ============================================================
echo [步骤 5/5] 安装依赖并初始化数据库...
echo.

REM 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo ✗ 未检测到 Node.js
    echo 请先安装 Node.js ^>= 18: https://nodejs.org/
    pause
    exit /b 1
)

color 0A
echo ✓ Node.js: 
node -v
echo ✓ npm:
npm -v
color 07
echo.

REM 安装根目录依赖
echo 正在安装启动工具...
call npm install --silent
echo.

REM 安装后端依赖
echo 正在安装后端依赖...
cd backend
call npm install --silent
cd ..
echo.

REM 安装前端依赖
echo 正在安装前端依赖...
cd frontend
call npm install --silent
cd ..
echo.

REM 初始化数据库
echo 正在初始化数据库...
call npm run db:init
echo.

color 0A
echo ✓ 所有依赖安装完成
color 07
echo.

REM ============================================================
REM 完成提示
REM ============================================================
cls
color 0A
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║              ✨ 安装完成！系统已准备就绪 ✨                 ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
color 07

echo 📋 配置信息：
echo   - MySQL 数据库: interview_training
echo   - MySQL 用户: root
echo   - 后端端口: 3001
echo   - 前端端口: 3000

if "%DEEPSEEK_API_KEY%"=="your_deepseek_api_key_here" (
    color 0E
    echo   - DeepSeek API: 未配置 ^(AI 功能不可用^)
    color 07
) else (
    color 0A
    echo   - DeepSeek API: 已配置
    color 07
)
echo.

echo 🚀 启动应用：
echo   dev.bat
echo.

echo 📚 访问地址：
echo   前端: http://localhost:3000
echo   后端: http://localhost:3001
echo.

echo ⚙️ 配置文件位置：
echo   backend\.env
echo.

if "%DEEPSEEK_API_KEY%"=="your_deepseek_api_key_here" (
    color 0E
    echo 💡 提示：如需启用 AI 功能，请编辑 backend\.env 添加 DEEPSEEK_API_KEY
    color 07
    echo.
)

set /p REPLY="是否现在启动应用? (y/n): "
if /i "%REPLY%"=="y" (
    echo.
    echo 正在启动...
    echo.
    timeout /t 1 >nul
    call dev.bat
) else (
    echo.
    echo 稍后运行 dev.bat 启动应用
    echo.
    pause
)
