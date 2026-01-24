# 创建 GitHub 仓库并推送代码

本文档说明如何将项目推送到 GitHub。

## 方法1：使用 GitHub 网页（推荐）

### 步骤1：在 GitHub 上创建新仓库

1. 访问 https://github.com/new
2. 填写仓库信息：
   - **Repository name**: `interview-training-system`
   - **Description**: `香港升中面试训练系统 - 为小学生提供AI驱动的个性化面试准备平台`
   - **Visibility**: 选择 Public 或 Private
   - **⚠️ 不要**勾选 "Add a README file"
   - **⚠️ 不要**勾选 "Add .gitignore"
   - **⚠️ 不要**选择 "Choose a license"

3. 点击 "Create repository"

### 步骤2：推送本地代码

复制 GitHub 显示的命令，或直接运行：

```bash
cd /Users/chenkan/project/plans/interview-training-system

# 添加远程仓库（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/interview-training-system.git

# 推送代码
git push -u origin main
```

### 步骤3：验证

访问你的 GitHub 仓库页面，应该能看到所有文件已上传。

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

### 登录并创建仓库

```bash
cd /Users/chenkan/project/plans/interview-training-system

# 登录 GitHub
gh auth login

# 创建并推送仓库
gh repo create interview-training-system --public --source=. --remote=origin --push
```

---

## 完成后的仓库信息

你的 GitHub 仓库应该包含：

```
interview-training-system/
├── 📄 README.md                 # 项目说明
├── 📄 QUICKSTART.md             # 快速开始指南
├── 📄 .gitignore                # Git 忽略规则
├── 📄 package.json              # 根依赖配置
├── 🚀 setup.sh/setup.bat        # 一键安装脚本
├── 🚀 dev.sh/dev.bat            # 一键启动脚本
├── 📁 frontend/                 # React 前端
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── 📁 backend/                  # Node.js 后端
│   ├── src/
│   ├── package.json
│   └── .env.example
└── 📁 docs/                     # 完整文档
    ├── API.md
    ├── DEVELOPMENT.md
    ├── MYSQL_SETUP.md
    ├── SETUP_GUIDE.md
    └── TESTING.md
```

## 推荐的仓库设置

### 添加主题标签（Topics）

在 GitHub 仓库页面，点击 "About" 旁的设置图标，添加：

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

### 设置仓库描述

```
香港升中面试训练系统 - AI驱动的个性化面试准备平台，支持七大专项训练、智能反馈和进度追踪
```

### 添加网站链接

如果部署了在线版本，可以添加到仓库的 Website 字段。

---

## 常见问题

### ❌ 推送被拒绝：Authentication failed

**原因**: GitHub 不再支持密码认证

**解决**: 使用 Personal Access Token (PAT)

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 勾选 `repo` 权限
4. 复制生成的 token
5. 推送时使用 token 作为密码

或者设置 SSH 密钥：
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# 将输出复制到 GitHub Settings > SSH Keys
```

### ❌ 推送被拒绝：remote contains work that you do not have

**原因**: 远程仓库包含本地没有的提交（如创建时添加了 README）

**解决**:
```bash
git pull origin main --rebase
git push -u origin main
```

### ❌ 无法推送：403 Forbidden

**原因**: 仓库名已存在或没有权限

**解决**: 
1. 确认仓库名拼写正确
2. 确认使用了正确的 GitHub 用户名
3. 检查是否有推送权限

---

## 下一步

推送成功后：

1. ✅ 在 GitHub 上查看代码
2. ✅ 设置仓库的 About 描述和主题
3. ✅ 添加 LICENSE 文件（如需要）
4. ✅ 设置 GitHub Actions（CI/CD，如需要）
5. ✅ 邀请协作者（如有团队）

---

**现在就去创建你的 GitHub 仓库吧！** 🚀
