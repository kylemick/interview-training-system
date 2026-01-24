@echo off
REM 升中面试训练系统 - Windows 一键启动脚本

echo ========================================
echo 升中面试训练系统 - 一键启动
echo ========================================
echo.

cd /d "%~dp0"

REM 检查 Node.js
echo [检查环境...]
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未安装 Node.js
    echo 请安装 Node.js ^>= 18: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js: 
node -v
echo [OK] npm:
npm -v
echo.

REM 检查并创建 .env 文件
if not exist "backend\.env" (
    echo [创建配置文件...]
    copy backend\.env.example backend\.env
    echo [提示] 请编辑 backend\.env 文件，配置 DEEPSEEK_API_KEY（可选）
    echo.
)

REM 检查根目录依赖
if not exist "node_modules" (
    echo [安装启动工具...]
    call npm install
    echo.
)

REM 检查后端依赖
if not exist "backend\node_modules" (
    echo [安装后端依赖...]
    cd backend
    call npm install
    cd ..
    echo.
)

REM 检查前端依赖
if not exist "frontend\node_modules" (
    echo [安装前端依赖...]
    cd frontend
    call npm install
    cd ..
    echo.
)

REM 初始化数据库
if not exist "data\interview.db" (
    echo [初始化数据库...]
    call npm run db:init
    echo.
)

echo ========================================
echo 启动应用...
echo ========================================
echo.
echo [提示]
echo   - 后端运行在: http://localhost:3001
echo   - 前端运行在: http://localhost:3000
echo   - 按 Ctrl+C 停止所有服务
echo.
echo ========================================
echo.

REM 启动前后端
call npm run dev
