# 升中面试训练系统 - 快速开始

## 🎉 最简单的方式：一键安装（推荐）

### 运行安装脚本

**macOS / Linux:**
```bash
cd /Users/chenkan/project/plans/interview-training-system
./setup.sh
```

**Windows:**
```cmd
setup.bat
```

### 脚本会做什么？

安装脚本会交互式地引导你完成所有配置：

1. ✅ **检测并安装 MySQL**（如果未安装）
2. ✅ **设置 MySQL 密码**（新安装）或验证现有密码
3. ✅ **配置 DeepSeek API Key**（可选，用于 AI 功能）
4. ✅ **自动创建 `.env` 文件**
5. ✅ **安装所有依赖**
6. ✅ **创建和初始化数据库**
7. ✅ **询问是否立即启动**

**只需回答几个问题，剩下的全自动！** 🚀

---

## 🔄 已安装？直接启动

如果已经运行过安装脚本，以后只需：

```bash
./dev.sh          # macOS/Linux
# 或
dev.bat          # Windows
```

### 访问应用

- 前端应用：http://localhost:3000
- 后端 API：http://localhost:3001/health

## ✅ 验证清单

运行以下命令验证安装：

### 1. MySQL 已启动

```bash
mysql -u root -p
# 输入密码后能成功登录即可
```

### 2. Node.js 版本正确

```bash
node -v
# 应该显示 v18.x 或 v20.x（推荐）
# v24 可能有兼容性问题
```

### 3. 数据库已创建

```bash
mysql -u root -p -e "SHOW DATABASES LIKE 'interview_training';"
# 应该看到 interview_training 数据库
```

### 4. 后端健康检查

```bash
curl http://localhost:3001/health
# 应该返回: {"status":"ok"}
```

### 5. 前端可访问

在浏览器打开：http://localhost:3000

## 🔧 常见问题

### ❌ MySQL 连接失败

**错误**: `Error: connect ECONNREFUSED 127.0.0.1:3306`

**解决**:
```bash
# 启动 MySQL
brew services start mysql  # macOS
sudo systemctl start mysql  # Linux
```

### ❌ 密码错误

**错误**: `Access denied for user 'root'@'localhost'`

**解决**:
1. 确认 MySQL 密码正确
2. 更新 `backend/.env` 中的 `DB_PASSWORD`
3. 如需重置密码，参考 [MySQL 安装指南](docs/MYSQL_SETUP.md)

### ❌ Node.js 版本问题

**推荐使用 Node.js v20 LTS**

如果你使用 v24，建议切换：
```bash
# 使用 nvm（推荐）
nvm install 20
nvm use 20

# 然后重新运行
./dev.sh
```

### ❌ 端口被占用

**错误**: `Port 3000 or 3001 is already in use`

**解决**:
```bash
# 查找并关闭占用端口的进程
lsof -ti:3000 | xargs kill -9  # 关闭 3000 端口
lsof -ti:3001 | xargs kill -9  # 关闭 3001 端口
```

## 📊 下一步

启动成功后，你可以：

1. **浏览界面** - 熟悉系统的各个模块
2. **配置 AI Key** - 编辑 `backend/.env`，添加 `DEEPSEEK_API_KEY`
3. **开始开发** - 查看 [开发指南](docs/DEVELOPMENT.md)
4. **查看 API** - 浏览 [API 文档](docs/API.md)

## 🆘 需要帮助？

如果遇到其他问题：

1. 查看 [MySQL 安装指南](docs/MYSQL_SETUP.md)
2. 查看 [开发文档](docs/DEVELOPMENT.md)
3. 检查终端日志中的错误信息

## 🎯 功能测试建议

虽然大部分功能还在开发中，但你可以测试：

✅ 前后端是否正常启动
✅ 数据库连接是否正常
✅ 页面路由是否正常
✅ API 健康检查

后续功能（计划开发）：
- 学校档案管理
- 题库系统
- 训练计划生成
- AI 面试练习
- 进度追踪
- 反馈分析

---

**祝开发顺利！** 🎉
