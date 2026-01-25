# MySQL 數據庫安装和配置指南

本項目使用 MySQL 數據庫，无需编译原生模块，開箱即用。

## 📋 安装 MySQL

### macOS (使用 Homebrew)

```bash
# 安装 MySQL
brew install mysql

# 启動 MySQL 服務
brew services start mysql

# 设置 root 密碼（可選，首次安装建議设置）
mysql_secure_installation
```

### Windows

1. 下载 MySQL 安装器：https://dev.mysql.com/downloads/installer/
2. 运行安装程序，選擇 "Developer Default"
3. 按照向導完成安装
4. 記住设置的 root 密碼

### Linux (Ubuntu/Debian)

```bash
# 更新包列表
sudo apt update

# 安装 MySQL
sudo apt install mysql-server

# 启動 MySQL 服務
sudo systemctl start mysql

# 设置 root 密碼
sudo mysql_secure_installation
```

## 🔧 配置數據庫

### 方法1：自動創建（推荐）

係統會在首次运行時自動創建數據庫和表。你只需要：

1. 確保 MySQL 服務已启動
2. 配置 `.env` 文件（见下方）
3. 运行 `./dev.sh` 或 `npm run db:init`

### 方法2：手動創建

```bash
# 登錄 MySQL
mysql -u root -p

# 創建數據庫
CREATE DATABASE interview_training CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 創建用户（可選，生产环境推荐）
CREATE USER 'interview_user'@'localhost' IDENTIFIED BY 'your_secure_password';

# 授权
GRANT ALL PRIVILEGES ON interview_training.* TO 'interview_user'@'localhost';
FLUSH PRIVILEGES;

# 退出
EXIT;
```

## ⚙️ 配置环境变量

编輯 `backend/.env` 文件：

```env
# MySQL 數據庫配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_DATABASE=interview_training
DB_CONNECTION_LIMIT=10
```

### 配置說明

- **DB_HOST**: MySQL 服務器地址（本地開發使用 `localhost`）
- **DB_PORT**: MySQL 端口（默认 3306）
- **DB_USER**: 數據庫用户名（默认 `root`）
- **DB_PASSWORD**: 數據庫密碼（首次安装時设置的密碼）
- **DB_DATABASE**: 數據庫名称（默认 `interview_training`）
- **DB_CONNECTION_LIMIT**: 连接池大小（默认 10）

## ✅ 验证安装

### 1. 检查 MySQL 服務狀態

```bash
# macOS (Homebrew)
brew services list | grep mysql

# Linux
sudo systemctl status mysql

# Windows
# 在"服務"应用中查看 MySQL 服務狀態
```

### 2. 测試连接

```bash
# 使用 MySQL 命令行
mysql -u root -p

# 输入密碼後，应该能看到 MySQL 提示符
mysql>
```

### 3. 运行數據庫初始化

```bash
cd /Users/chenkan/project/plans/interview-training-system
npm run db:init
```

应该看到：
```
✅ 數據庫 interview_training 已準備就绪
✅ 數據表創建成功
✅ 數據庫初始化完成
```

## 🔍 常见問題

### ❌ 問題1：无法连接到 MySQL

**错误信息：**
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**解决方案：**
```bash
# macOS
brew services start mysql

# Linux
sudo systemctl start mysql
sudo systemctl enable mysql  # 開机自启

# Windows
# 在"服務"中启動 MySQL80 服務
```

### ❌ 問題2：Access denied for user

**错误信息：**
```
Error: Access denied for user 'root'@'localhost'
```

**解决方案：**

1. 重置 root 密碼（macOS/Linux）：
```bash
# 停止 MySQL
brew services stop mysql  # macOS
sudo systemctl stop mysql  # Linux

# 安全模式启動
mysqld_safe --skip-grant-tables &

# 登錄并重置密碼
mysql -u root
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
EXIT;

# 重启 MySQL
brew services restart mysql  # macOS
sudo systemctl restart mysql  # Linux
```

2. 更新 `.env` 文件中的密碼

### ❌ 問題3：數據庫已存在

如果需要重新初始化：

```bash
mysql -u root -p
DROP DATABASE interview_training;
EXIT;

# 然後重新运行
npm run db:init
```

## 🎯 MySQL vs SQLite

| 特性 | MySQL | SQLite |
|------|-------|--------|
| 安装 | 需要单独安装 | 无需安装 |
| 编译 | ✅ 无需编译 | ❌ 需要编译原生模块 |
| Node.js 兼容性 | ✅ 支持所有版本 | ❌ 新版本可能不支持 |
| 性能 | 更好的并發处理 | 单文件，简单场景足够 |
| 生产环境 | ✅ 推荐 | 不推荐 |
| 數據備份 | mysqldump | 复制文件 |
| 扩展性 | ✅ 可扩展到多服務器 | 仅单机 |

## 📊 數據庫管理工具（可選）

推荐使用以下工具管理 MySQL：

- **MySQL Workbench** (官方): https://dev.mysql.com/downloads/workbench/
- **phpMyAdmin** (Web 界面): https://www.phpmyadmin.net/
- **TablePlus** (macOS/Windows): https://tableplus.com/
- **DBeaver** (跨平台): https://dbeaver.io/

## 🚀 快速启動

完整的启動步骤：

```bash
# 1. 確保 MySQL 已启動
brew services start mysql  # macOS

# 2. 配置 .env 文件
cd /Users/chenkan/project/plans/interview-training-system/backend
cp .env.example .env
# 编輯 .env，设置 DB_PASSWORD

# 3. 启動項目（會自動初始化數據庫）
cd ..
./dev.sh
```

## 📝 備份和恢复

### 備份數據庫

```bash
mysqldump -u root -p interview_training > backup.sql
```

### 恢复數據庫

```bash
mysql -u root -p interview_training < backup.sql
```

---

**现在你可以继续运行** `./dev.sh` **启動項目了！** 🎉
