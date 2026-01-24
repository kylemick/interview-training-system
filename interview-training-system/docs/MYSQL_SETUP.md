# MySQL 数据库安装和配置指南

本项目使用 MySQL 数据库，无需编译原生模块，开箱即用。

## 📋 安装 MySQL

### macOS (使用 Homebrew)

```bash
# 安装 MySQL
brew install mysql

# 启动 MySQL 服务
brew services start mysql

# 设置 root 密码（可选，首次安装建议设置）
mysql_secure_installation
```

### Windows

1. 下载 MySQL 安装器：https://dev.mysql.com/downloads/installer/
2. 运行安装程序，选择 "Developer Default"
3. 按照向导完成安装
4. 记住设置的 root 密码

### Linux (Ubuntu/Debian)

```bash
# 更新包列表
sudo apt update

# 安装 MySQL
sudo apt install mysql-server

# 启动 MySQL 服务
sudo systemctl start mysql

# 设置 root 密码
sudo mysql_secure_installation
```

## 🔧 配置数据库

### 方法1：自动创建（推荐）

系统会在首次运行时自动创建数据库和表。你只需要：

1. 确保 MySQL 服务已启动
2. 配置 `.env` 文件（见下方）
3. 运行 `./dev.sh` 或 `npm run db:init`

### 方法2：手动创建

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE interview_training CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户（可选，生产环境推荐）
CREATE USER 'interview_user'@'localhost' IDENTIFIED BY 'your_secure_password';

# 授权
GRANT ALL PRIVILEGES ON interview_training.* TO 'interview_user'@'localhost';
FLUSH PRIVILEGES;

# 退出
EXIT;
```

## ⚙️ 配置环境变量

编辑 `backend/.env` 文件：

```env
# MySQL 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_DATABASE=interview_training
DB_CONNECTION_LIMIT=10
```

### 配置说明

- **DB_HOST**: MySQL 服务器地址（本地开发使用 `localhost`）
- **DB_PORT**: MySQL 端口（默认 3306）
- **DB_USER**: 数据库用户名（默认 `root`）
- **DB_PASSWORD**: 数据库密码（首次安装时设置的密码）
- **DB_DATABASE**: 数据库名称（默认 `interview_training`）
- **DB_CONNECTION_LIMIT**: 连接池大小（默认 10）

## ✅ 验证安装

### 1. 检查 MySQL 服务状态

```bash
# macOS (Homebrew)
brew services list | grep mysql

# Linux
sudo systemctl status mysql

# Windows
# 在"服务"应用中查看 MySQL 服务状态
```

### 2. 测试连接

```bash
# 使用 MySQL 命令行
mysql -u root -p

# 输入密码后，应该能看到 MySQL 提示符
mysql>
```

### 3. 运行数据库初始化

```bash
cd /Users/chenkan/project/plans/interview-training-system
npm run db:init
```

应该看到：
```
✅ 数据库 interview_training 已准备就绪
✅ 数据表创建成功
✅ 数据库初始化完成
```

## 🔍 常见问题

### ❌ 问题1：无法连接到 MySQL

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
sudo systemctl enable mysql  # 开机自启

# Windows
# 在"服务"中启动 MySQL80 服务
```

### ❌ 问题2：Access denied for user

**错误信息：**
```
Error: Access denied for user 'root'@'localhost'
```

**解决方案：**

1. 重置 root 密码（macOS/Linux）：
```bash
# 停止 MySQL
brew services stop mysql  # macOS
sudo systemctl stop mysql  # Linux

# 安全模式启动
mysqld_safe --skip-grant-tables &

# 登录并重置密码
mysql -u root
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
EXIT;

# 重启 MySQL
brew services restart mysql  # macOS
sudo systemctl restart mysql  # Linux
```

2. 更新 `.env` 文件中的密码

### ❌ 问题3：数据库已存在

如果需要重新初始化：

```bash
mysql -u root -p
DROP DATABASE interview_training;
EXIT;

# 然后重新运行
npm run db:init
```

## 🎯 MySQL vs SQLite

| 特性 | MySQL | SQLite |
|------|-------|--------|
| 安装 | 需要单独安装 | 无需安装 |
| 编译 | ✅ 无需编译 | ❌ 需要编译原生模块 |
| Node.js 兼容性 | ✅ 支持所有版本 | ❌ 新版本可能不支持 |
| 性能 | 更好的并发处理 | 单文件，简单场景足够 |
| 生产环境 | ✅ 推荐 | 不推荐 |
| 数据备份 | mysqldump | 复制文件 |
| 扩展性 | ✅ 可扩展到多服务器 | 仅单机 |

## 📊 数据库管理工具（可选）

推荐使用以下工具管理 MySQL：

- **MySQL Workbench** (官方): https://dev.mysql.com/downloads/workbench/
- **phpMyAdmin** (Web 界面): https://www.phpmyadmin.net/
- **TablePlus** (macOS/Windows): https://tableplus.com/
- **DBeaver** (跨平台): https://dbeaver.io/

## 🚀 快速启动

完整的启动步骤：

```bash
# 1. 确保 MySQL 已启动
brew services start mysql  # macOS

# 2. 配置 .env 文件
cd /Users/chenkan/project/plans/interview-training-system/backend
cp .env.example .env
# 编辑 .env，设置 DB_PASSWORD

# 3. 启动项目（会自动初始化数据库）
cd ..
./dev.sh
```

## 📝 备份和恢复

### 备份数据库

```bash
mysqldump -u root -p interview_training > backup.sql
```

### 恢复数据库

```bash
mysql -u root -p interview_training < backup.sql
```

---

**现在你可以继续运行** `./dev.sh` **启动项目了！** 🎉
