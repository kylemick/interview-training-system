# 升中面試訓練係統 - 快速開始

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

### 脚本會做什么？

安装脚本會交互式地引導你完成所有配置：

1. ✅ **检测并安装 MySQL**（如果未安装）
2. ✅ **设置 MySQL 密碼**（新安装）或验证现有密碼
3. ✅ **配置 DeepSeek API Key**（可選，用于 AI 功能）
4. ✅ **自動創建 `.env` 文件**
5. ✅ **安装所有依赖**
6. ✅ **創建和初始化數據庫**
7. ✅ **询問是否立即启動**

**只需回答几个問題，剩下的全自動！** 🚀

---

## 🔄 已安装？直接启動

如果已经运行過安装脚本，以後只需：

```bash
./dev.sh          # macOS/Linux
# 或
dev.bat          # Windows
```

### 访問应用

- 前端应用：http://localhost:3000
- 後端 API：http://localhost:3001/health

## ✅ 验证清单

运行以下命令验证安装：

### 1. MySQL 已启動

```bash
mysql -u root -p
# 输入密碼後能成功登錄即可
```

### 2. Node.js 版本正確

```bash
node -v
# 应该显示 v18.x 或 v20.x（推荐）
# v24 可能有兼容性問題
```

### 3. 數據庫已創建

```bash
mysql -u root -p -e "SHOW DATABASES LIKE 'interview_training';"
# 应该看到 interview_training 數據庫
```

### 4. 後端健康检查

```bash
curl http://localhost:3001/health
# 应该返回: {"status":"ok"}
```

### 5. 前端可访問

在浏览器打開：http://localhost:3000

## 🔧 常见問題

### ❌ MySQL 连接失敗

**错误**: `Error: connect ECONNREFUSED 127.0.0.1:3306`

**解决**:
```bash
# 启動 MySQL
brew services start mysql  # macOS
sudo systemctl start mysql  # Linux
```

### ❌ 密碼错误

**错误**: `Access denied for user 'root'@'localhost'`

**解决**:
1. 確认 MySQL 密碼正確
2. 更新 `backend/.env` 中的 `DB_PASSWORD`
3. 如需重置密碼，參考 [MySQL 安装指南](docs/MYSQL_SETUP.md)

### ❌ Node.js 版本問題

**推荐使用 Node.js v20 LTS**

如果你使用 v24，建議切换：
```bash
# 使用 nvm（推荐）
nvm install 20
nvm use 20

# 然後重新运行
./dev.sh
```

### ❌ 端口被占用

**错误**: `Port 3000 or 3001 is already in use`

**解决**:
```bash
# 查找并關闭占用端口的進程
lsof -ti:3000 | xargs kill -9  # 關闭 3000 端口
lsof -ti:3001 | xargs kill -9  # 關闭 3001 端口
```

## 📊 下一步

启動成功後，你可以：

1. **浏览界面** - 熟悉係統的各个模块
2. **配置 AI Key** - 编輯 `backend/.env`，添加 `DEEPSEEK_API_KEY`
3. **開始開發** - 查看 [開發指南](docs/DEVELOPMENT.md)
4. **查看 API** - 浏览 [API 文檔](docs/API.md)

## 🆘 需要帮助？

如果遇到其他問題：

1. 查看 [MySQL 安装指南](docs/MYSQL_SETUP.md)
2. 查看 [開發文檔](docs/DEVELOPMENT.md)
3. 检查终端日志中的错误信息

## 🎯 功能测試建議

虽然大部分功能还在開發中，但你可以测試：

✅ 前後端是否正常启動
✅ 數據庫连接是否正常
✅ 页面路由是否正常
✅ API 健康检查

後续功能（計劃開發）：
- 學校檔案管理
- 題庫係統
- 訓練計劃生成
- AI 面試練習
- 進度追踪
- 反馈分析

---

**祝開發顺利！** 🎉
