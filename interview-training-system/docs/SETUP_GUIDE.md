# 安装指南 - 详细步骤說明

本文檔详细說明 `setup.sh` / `setup.bat` 安装脚本的工作流程和使用方法。

## 📋 安装脚本功能

一键安装脚本會自動完成以下步骤：

### 1. 环境检查
- ✅ 检测操作係統（macOS / Linux / Windows）
- ✅ 检查 Node.js 版本（需要 >= 18）
- ✅ 检查 npm 版本

### 2. MySQL 安装与配置
- ✅ 检测 MySQL 是否已安装
- ✅ 如未安装，提供自動安装選項（macOS 使用 Homebrew）
- ✅ 启動 MySQL 服務
- ✅ 配置 root 密碼（新安装）或验证现有密碼

### 3. API 配置
- ✅ 交互式输入 DeepSeek API Key
- ✅ 支持跳過（稍後配置）

### 4. 环境文件生成
- ✅ 自動生成 `backend/.env` 文件
- ✅ 填入 MySQL 密碼和 API Key
- ✅ 设置默认配置項

### 5. 依赖安装
- ✅ 安装根目錄依赖（concurrently 等）
- ✅ 安装後端依赖（express, mysql2 等）
- ✅ 安装前端依赖（react, vite 等）

### 6. 數據庫初始化
- ✅ 創建 `interview_training` 數據庫
- ✅ 执行 schema.sql 創建表結构
- ✅ 验证數據庫连接

### 7. 启動確认
- ✅ 显示配置摘要
- ✅ 询問是否立即启動应用

## 🚀 使用方法

### macOS / Linux

```bash
# 進入項目目錄
cd /Users/chenkan/project/plans/interview-training-system

# 运行安装脚本
./setup.sh
```

### Windows

双击 `setup.bat` 或在命令提示符中：

```cmd
cd path\to\interview-training-system
setup.bat
```

## 📝 交互式問答示例

### 問題 1: 是否安装 MySQL？

```
是否现在安装 MySQL? (y/n):
```

- 输入 `y`：自動安装 MySQL
- 输入 `n`：退出，要求手動安装後重試

### 問題 2: 设置 MySQL 密碼

**场景 A：新安装 MySQL**
```
请输入 MySQL root 密碼（用于本項目）: ********
请再次输入密碼確认: ********
```

**场景 B：已有 MySQL**
```
请输入现有的 MySQL root 密碼
MySQL root 密碼: ********
```

脚本會验证密碼是否正確，错误則要求重新输入。

### 問題 3: DeepSeek API Key

```
请输入 DeepSeek API Key（可留空）:
```

- 输入 API Key：启用 AI 功能
- 直接回车：跳過，稍後配置

### 問題 4: 是否立即启動？

```
是否现在启動应用? (y/n):
```

- 输入 `y`：自動运行 `dev.sh` 启動应用
- 输入 `n`：退出，稍後手動启動

## 🎬 完整安装流程示例

```bash
$ ./setup.sh

╔═══════════════════════════════════════════════════════════╗
║         升中面試訓練係統 - 一键安装向導                    ║
╚═══════════════════════════════════════════════════════════╝

[步骤 1/6] 检查操作係統...
✓ 检测到 macOS

[步骤 2/6] 检查 MySQL...
⚠ MySQL 未安装
是否现在安装 MySQL? (y/n): y
正在使用 Homebrew 安装 MySQL...
✓ MySQL 安装完成

[步骤 3/6] 配置 MySQL...
请输入 MySQL root 密碼（用于本項目）: ********
请再次输入密碼確认: ********
✓ 密碼设置完成

[步骤 4/6] 配置 DeepSeek API...
请输入 DeepSeek API Key（可留空）: sk-xxxxxxxxxxxxx
✓ API Key 已设置

[步骤 5/6] 創建环境配置文件...
✓ 环境配置文件已創建: backend/.env

[步骤 6/6] 安装依赖并初始化數據庫...
✓ Node.js: v20.10.0
✓ npm: 10.2.3
正在安装启動工具...
正在安装後端依赖...
正在安装前端依赖...
正在初始化數據庫...
✓ 所有依赖安装完成

╔═══════════════════════════════════════════════════════════╗
║              ✨ 安装完成！係統已準備就绪 ✨                 ║
╚═══════════════════════════════════════════════════════════╝

📋 配置信息：
  - MySQL 數據庫: interview_training
  - MySQL 用户: root
  - 後端端口: 3001
  - 前端端口: 3000
  - DeepSeek API: 已配置

🚀 启動应用：
  ./dev.sh

是否现在启動应用? (y/n): y

正在启動...
```

## ⚙️ 生成的配置文件

安装完成後，`backend/.env` 文件內容如下：

```env
# 後端服務器配置
PORT=3001

# DeepSeek API 配置
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxx
DEEPSEEK_API_URL=https://api.deepseek.com

# MySQL 數據庫配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=interview_training
DB_CONNECTION_LIMIT=10
```

## 🔧 手動修改配置

如需修改配置，直接编輯 `backend/.env` 文件：

```bash
# macOS/Linux
nano backend/.env

# Windows
notepad backend\.env
```

修改後重启应用：

```bash
# 按 Ctrl+C 停止当前运行
# 然後重新启動
./dev.sh
```

## ❗ 常见問題

### MySQL 安装失敗（macOS）

**错误**: Homebrew 未安装

**解决**:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### MySQL 密碼验证失敗

**错误**: Access denied

**检查**:
1. 密碼是否正確
2. MySQL 服務是否启動
   ```bash
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status mysql
   
   # Windows
   # 在"服務"中查看 MySQL80 狀態
   ```

### Node.js 版本過低

**错误**: Node.js < 18

**解决**: 安装最新的 LTS 版本
```bash
# 使用 nvm（推荐）
nvm install 20
nvm use 20

# 或從官网下载
# https://nodejs.org/
```

### 端口被占用

**错误**: Port 3000/3001 already in use

**解决**:
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## 🔄 重新安装

如需重新运行安装脚本：

```bash
# 1. 清理环境
rm backend/.env
rm -rf node_modules backend/node_modules frontend/node_modules

# 2. 删除數據庫（可選）
mysql -u root -p -e "DROP DATABASE interview_training;"

# 3. 重新运行安装
./setup.sh
```

## 📚 相關文檔

- [MySQL 详细安装指南](./MYSQL_SETUP.md)
- [快速開始指南](../QUICKSTART.md)
- [開發文檔](./DEVELOPMENT.md)

---

**安装過程中遇到問題？** 请查看上述常见問題或參考其他文檔。
