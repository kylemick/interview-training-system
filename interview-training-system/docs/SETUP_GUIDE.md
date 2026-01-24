# 安装指南 - 详细步骤说明

本文档详细说明 `setup.sh` / `setup.bat` 安装脚本的工作流程和使用方法。

## 📋 安装脚本功能

一键安装脚本会自动完成以下步骤：

### 1. 环境检查
- ✅ 检测操作系统（macOS / Linux / Windows）
- ✅ 检查 Node.js 版本（需要 >= 18）
- ✅ 检查 npm 版本

### 2. MySQL 安装与配置
- ✅ 检测 MySQL 是否已安装
- ✅ 如未安装，提供自动安装选项（macOS 使用 Homebrew）
- ✅ 启动 MySQL 服务
- ✅ 配置 root 密码（新安装）或验证现有密码

### 3. API 配置
- ✅ 交互式输入 DeepSeek API Key
- ✅ 支持跳过（稍后配置）

### 4. 环境文件生成
- ✅ 自动生成 `backend/.env` 文件
- ✅ 填入 MySQL 密码和 API Key
- ✅ 设置默认配置项

### 5. 依赖安装
- ✅ 安装根目录依赖（concurrently 等）
- ✅ 安装后端依赖（express, mysql2 等）
- ✅ 安装前端依赖（react, vite 等）

### 6. 数据库初始化
- ✅ 创建 `interview_training` 数据库
- ✅ 执行 schema.sql 创建表结构
- ✅ 验证数据库连接

### 7. 启动确认
- ✅ 显示配置摘要
- ✅ 询问是否立即启动应用

## 🚀 使用方法

### macOS / Linux

```bash
# 进入项目目录
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

## 📝 交互式问答示例

### 问题 1: 是否安装 MySQL？

```
是否现在安装 MySQL? (y/n):
```

- 输入 `y`：自动安装 MySQL
- 输入 `n`：退出，要求手动安装后重试

### 问题 2: 设置 MySQL 密码

**场景 A：新安装 MySQL**
```
请输入 MySQL root 密码（用于本项目）: ********
请再次输入密码确认: ********
```

**场景 B：已有 MySQL**
```
请输入现有的 MySQL root 密码
MySQL root 密码: ********
```

脚本会验证密码是否正确，错误则要求重新输入。

### 问题 3: DeepSeek API Key

```
请输入 DeepSeek API Key（可留空）:
```

- 输入 API Key：启用 AI 功能
- 直接回车：跳过，稍后配置

### 问题 4: 是否立即启动？

```
是否现在启动应用? (y/n):
```

- 输入 `y`：自动运行 `dev.sh` 启动应用
- 输入 `n`：退出，稍后手动启动

## 🎬 完整安装流程示例

```bash
$ ./setup.sh

╔═══════════════════════════════════════════════════════════╗
║         升中面试训练系统 - 一键安装向导                    ║
╚═══════════════════════════════════════════════════════════╝

[步骤 1/6] 检查操作系统...
✓ 检测到 macOS

[步骤 2/6] 检查 MySQL...
⚠ MySQL 未安装
是否现在安装 MySQL? (y/n): y
正在使用 Homebrew 安装 MySQL...
✓ MySQL 安装完成

[步骤 3/6] 配置 MySQL...
请输入 MySQL root 密码（用于本项目）: ********
请再次输入密码确认: ********
✓ 密码设置完成

[步骤 4/6] 配置 DeepSeek API...
请输入 DeepSeek API Key（可留空）: sk-xxxxxxxxxxxxx
✓ API Key 已设置

[步骤 5/6] 创建环境配置文件...
✓ 环境配置文件已创建: backend/.env

[步骤 6/6] 安装依赖并初始化数据库...
✓ Node.js: v20.10.0
✓ npm: 10.2.3
正在安装启动工具...
正在安装后端依赖...
正在安装前端依赖...
正在初始化数据库...
✓ 所有依赖安装完成

╔═══════════════════════════════════════════════════════════╗
║              ✨ 安装完成！系统已准备就绪 ✨                 ║
╚═══════════════════════════════════════════════════════════╝

📋 配置信息：
  - MySQL 数据库: interview_training
  - MySQL 用户: root
  - 后端端口: 3001
  - 前端端口: 3000
  - DeepSeek API: 已配置

🚀 启动应用：
  ./dev.sh

是否现在启动应用? (y/n): y

正在启动...
```

## ⚙️ 生成的配置文件

安装完成后，`backend/.env` 文件内容如下：

```env
# 后端服务器配置
PORT=3001

# DeepSeek API 配置
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxx
DEEPSEEK_API_URL=https://api.deepseek.com

# MySQL 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=interview_training
DB_CONNECTION_LIMIT=10
```

## 🔧 手动修改配置

如需修改配置，直接编辑 `backend/.env` 文件：

```bash
# macOS/Linux
nano backend/.env

# Windows
notepad backend\.env
```

修改后重启应用：

```bash
# 按 Ctrl+C 停止当前运行
# 然后重新启动
./dev.sh
```

## ❗ 常见问题

### MySQL 安装失败（macOS）

**错误**: Homebrew 未安装

**解决**:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### MySQL 密码验证失败

**错误**: Access denied

**检查**:
1. 密码是否正确
2. MySQL 服务是否启动
   ```bash
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status mysql
   
   # Windows
   # 在"服务"中查看 MySQL80 状态
   ```

### Node.js 版本过低

**错误**: Node.js < 18

**解决**: 安装最新的 LTS 版本
```bash
# 使用 nvm（推荐）
nvm install 20
nvm use 20

# 或从官网下载
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

# 2. 删除数据库（可选）
mysql -u root -p -e "DROP DATABASE interview_training;"

# 3. 重新运行安装
./setup.sh
```

## 📚 相关文档

- [MySQL 详细安装指南](./MYSQL_SETUP.md)
- [快速开始指南](../QUICKSTART.md)
- [开发文档](./DEVELOPMENT.md)

---

**安装过程中遇到问题？** 请查看上述常见问题或参考其他文档。
