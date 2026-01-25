# 創建 GitHub 仓庫并推送代碼

本文檔說明如何将項目推送到 GitHub。

## 方法1：使用 GitHub 网页（推荐）

### 步骤1：在 GitHub 上創建新仓庫

1. 访問 https://github.com/new
2. 填写仓庫信息：
   - **Repository name**: `interview-training-system`
   - **Description**: `香港升中面試訓練係統 - 为小學生提供AI驱動的个性化面試準備平台`
   - **Visibility**: 選擇 Public 或 Private
   - **⚠️ 不要**勾選 "Add a README file"
   - **⚠️ 不要**勾選 "Add .gitignore"
   - **⚠️ 不要**選擇 "Choose a license"

3. 點击 "Create repository"

### 步骤2：推送本地代碼

复制 GitHub 显示的命令，或直接运行：

```bash
cd /Users/chenkan/project/plans/interview-training-system

# 添加远程仓庫（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/interview-training-system.git

# 推送代碼
git push -u origin main
```

### 步骤3：验证

访問你的 GitHub 仓庫页面，应该能看到所有文件已上傳。

---

## 方法2：使用 GitHub CLI（需先安装）

### 安装 GitHub CLI

**macOS:**
```bash
brew install gh
```

**Linux:**
```bash
# Debian/Ubuntu
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

**Windows:**
```powershell
winget install --id GitHub.cli
```

### 登錄并創建仓庫

```bash
cd /Users/chenkan/project/plans/interview-training-system

# 登錄 GitHub
gh auth login

# 創建并推送仓庫
gh repo create interview-training-system --public --source=. --remote=origin --push
```

---

## 完成後的仓庫信息

你的 GitHub 仓庫应该包含：

```
interview-training-system/
├── 📄 README.md                 # 項目說明
├── 📄 QUICKSTART.md             # 快速開始指南
├── 📄 .gitignore                # Git 忽略規則
├── 📄 package.json              # 根依赖配置
├── 🚀 setup.sh/setup.bat        # 一键安装脚本
├── 🚀 dev.sh/dev.bat            # 一键启動脚本
├── 📁 frontend/                 # React 前端
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── 📁 backend/                  # Node.js 後端
│   ├── src/
│   ├── package.json
│   └── .env.example
└── 📁 docs/                     # 完整文檔
    ├── API.md
    ├── DEVELOPMENT.md
    ├── MYSQL_SETUP.md
    ├── SETUP_GUIDE.md
    └── TESTING.md
```

## 推荐的仓庫设置

### 添加主題標籤（Topics）

在 GitHub 仓庫页面，點击 "About" 旁的设置图標，添加：

```
interview-training
education
ai-powered
hong-kong
react
typescript
nodejs
mysql
deepseek
```

### 设置仓庫描述

```
香港升中面試訓練係統 - AI驱動的个性化面試準備平台，支持七大專項訓練、智能反馈和進度追踪
```

### 添加网站链接

如果部署了在线版本，可以添加到仓庫的 Website 字段。

---

## 常见問題

### ❌ 推送被拒绝：Authentication failed

**原因**: GitHub 不再支持密碼认证

**解决**: 使用 Personal Access Token (PAT)

1. 访問 https://github.com/settings/tokens
2. 點击 "Generate new token (classic)"
3. 勾選 `repo` 权限
4. 复制生成的 token
5. 推送時使用 token 作为密碼

或者设置 SSH 密钥：
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# 将输出复制到 GitHub Settings > SSH Keys
```

### ❌ 推送被拒绝：remote contains work that you do not have

**原因**: 远程仓庫包含本地没有的提交（如創建時添加了 README）

**解决**:
```bash
git pull origin main --rebase
git push -u origin main
```

### ❌ 无法推送：403 Forbidden

**原因**: 仓庫名已存在或没有权限

**解决**: 
1. 確认仓庫名拼写正確
2. 確认使用了正確的 GitHub 用户名
3. 检查是否有推送权限

---

## 下一步

推送成功後：

1. ✅ 在 GitHub 上查看代碼
2. ✅ 设置仓庫的 About 描述和主題
3. ✅ 添加 LICENSE 文件（如需要）
4. ✅ 设置 GitHub Actions（CI/CD，如需要）
5. ✅ 邀请协作者（如有团队）

---

**现在就去創建你的 GitHub 仓庫吧！** 🚀
