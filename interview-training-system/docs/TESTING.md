# 测试指南

## 快速测试

### 1. 一键启动（推荐）

```bash
cd /Users/chenkan/project/plans/interview-training-system
./start.sh
```

脚本会自动：
- ✅ 检查 Node.js 版本
- ✅ 安装依赖
- ✅ 创建 .env 文件
- ✅ 初始化数据库

### 2. 手动启动

#### 步骤1：安装依赖

```bash
# 前端
cd frontend
npm install

# 后端
cd ../backend
npm install
```

#### 步骤2：配置环境变量

```bash
# 复制配置模板
cp backend/.env.example backend/.env

# 编辑配置文件（可选，暂时可以不配置API key）
nano backend/.env
```

#### 步骤3：初始化数据库

```bash
cd backend
npm run db:init
```

你应该看到类似输出：
```
📦 Initializing database...
✅ Database initialized successfully
Database stats: { school_profiles: 0, questions: 0, ... }
```

#### 步骤4：启动后端

```bash
cd backend
npm run dev
```

成功启动后会显示：
```
🚀 Server running on http://localhost:3001
📝 Health check: http://localhost:3001/health
📊 Database stats: ...
```

#### 步骤5：启动前端（新终端窗口）

```bash
cd frontend
npm run dev
```

成功启动后会显示：
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

## 测试检查清单

### ✅ 后端测试

1. **健康检查**
```bash
curl http://localhost:3001/health
```
预期输出：
```json
{"status":"ok","timestamp":"2026-01-24T..."}
```

2. **API端点测试**
```bash
# 学校API
curl http://localhost:3001/api/schools

# 题库API
curl http://localhost:3001/api/questions

# 计划API
curl http://localhost:3001/api/plans
```

3. **数据库测试**
```bash
cd backend
npm run db:init
```
检查 `data/interview.db` 文件是否创建

4. **DeepSeek API测试（需要配置API key）**
```bash
cd backend
npm run test:api
```

### ✅ 前端测试

1. **访问主页**
   - 打开浏览器访问：http://localhost:3000
   - 应该看到"📚 升中面试训练系统"标题
   - 左侧导航栏应该显示7个菜单项

2. **导航测试**
   点击每个菜单项，确认页面切换正常：
   - ✅ 仪表盘 (/)
   - ✅ 训练计划 (/plan)
   - ✅ 开始练习 (/practice)
   - ✅ 查看反馈 (/feedback)
   - ✅ 进度报告 (/progress)
   - ✅ 面试回忆 (/memory)
   - ✅ 设置 (/settings)

3. **开发者工具检查**
   - 打开浏览器开发者工具（F12）
   - Console标签应该没有错误
   - Network标签检查API调用

## 常见问题排查

### 问题1：端口被占用

**错误**：`Error: listen EADDRINUSE: address already in use :::3001`

**解决**：
```bash
# 查找占用端口的进程
lsof -i :3001

# 杀死进程
kill -9 <PID>
```

### 问题2：依赖安装失败

**错误**：`npm install` 报错

**解决**：
```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 问题3：数据库文件权限

**错误**：`SQLITE_CANTOPEN: unable to open database file`

**解决**：
```bash
# 确保data目录存在且有写权限
mkdir -p data
chmod 755 data
```

### 问题4：TypeScript 编译错误

**错误**：TypeScript 类型错误

**解决**：
```bash
# 检查 TypeScript 版本
npm list typescript

# 重新安装
npm install --save-dev typescript@latest
```

### 问题5：前端代理不工作

**错误**：前端无法调用后端API

**解决**：
1. 确认后端已启动在 http://localhost:3001
2. 检查 `frontend/vite.config.ts` 中的 proxy 配置
3. 重启前端开发服务器

## 验证成功标准

### ✅ 后端成功标准

- [ ] 服务器启动在 http://localhost:3001
- [ ] `/health` 端点返回 200 状态码
- [ ] 数据库文件 `data/interview.db` 已创建
- [ ] 所有表已创建（9张表）
- [ ] 无错误日志

### ✅ 前端成功标准

- [ ] 应用启动在 http://localhost:3000
- [ ] 页面正常加载，无白屏
- [ ] 导航栏显示正常
- [ ] 所有页面可以访问
- [ ] 开发者工具无错误

### ✅ 集成成功标准

- [ ] 前端可以访问后端API
- [ ] 浏览器 Network 标签显示 API 调用成功
- [ ] 跨域（CORS）正常工作

## 下一步

测试通过后，可以开始：
1. 录入学校数据（SPCC、QC、LSC）
2. 添加种子题目
3. 实现具体功能模块

## 性能基准

首次启动预期时间：
- 后端启动：< 2秒
- 前端启动：< 5秒
- 数据库初始化：< 1秒
- API响应时间：< 100ms（不含AI调用）

## 获取帮助

如果遇到问题：
1. 查看终端的错误日志
2. 检查 `backend/.env` 配置
3. 确认 Node.js 版本 >= 18
4. 参考 [开发文档](./DEVELOPMENT.md)
