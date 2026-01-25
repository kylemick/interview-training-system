# AI 分析失败 - 故障排查指南

## 常见原因和解决方案

### 1. API Key 未配置或无效

**症状**:
- 错误信息: "API Key 验证失败" 或 "401 Unauthorized"
- 所有AI功能都无法使用

**解决方案**:
```bash
# 检查 .env 文件
cd interview-training-system/backend
cat .env | grep DEEPSEEK_API_KEY

# 确保 API Key 格式正确（以 sk- 开头）
# 示例: DEEPSEEK_API_KEY=sk-xxx...
```

**前端测试**:
1. 访问 http://localhost:5173/settings
2. 进入"基本设置"标签页
3. 输入 DeepSeek API Key
4. 点击"测试连接"按钮
5. 如果显示"API Key 验证成功"，说明配置正确

### 2. 网络连接问题

**症状**:
- 错误信息: "网络连接失败" 或 "ECONNREFUSED"
- AI功能偶尔失败

**解决方案**:
```bash
# 测试网络连接
ping platform.deepseek.com

# 测试 API 连接
curl -X POST https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"test"}]}'
```

### 3. API 配额用尽

**症状**:
- 错误信息: "API 调用频率超限" 或 "429 Too Many Requests"
- 之前可以用，现在突然不行

**解决方案**:
1. 访问 https://platform.deepseek.com
2. 登录您的账号
3. 查看 API 使用量和配额
4. 等待配额重置或升级套餐

### 4. 输入文本过长

**症状**:
- 面试回忆分析失败
- 错误信息: "Token limit exceeded" 或 "输入过长"

**解决方案**:
- 将长文本分段处理
- 每次输入不超过 2000 字
- DeepSeek 单次请求限制约 4000 tokens

### 5. JSON 解析失败

**症状**:
- 错误信息: "AI返回格式错误" 或 "解析失败"
- AI 返回了文本但无法解析

**解决方案**:
这通常是 AI 返回格式不符合预期，请重试。如果持续失败，可能需要调整提示词。

### 6. 后端服务未启动

**症状**:
- 错误信息: "Failed to fetch" 或 "Network Error"
- 所有 API 请求都失败

**解决方案**:
```bash
# 检查后端是否运行
curl http://localhost:3001/health

# 如果失败，重启后端
cd interview-training-system/backend
npm run dev
```

### 7. CORS 问题

**症状**:
- 浏览器控制台显示 CORS 错误
- 错误信息: "Access-Control-Allow-Origin"

**解决方案**:
后端已配置 CORS，如果出现此问题，检查：
```javascript
// backend/src/index.ts
app.use(cors()) // 确保这行存在
```

## 调试步骤

### 步骤 1: 检查后端日志

```bash
# 查看后端终端输出
# 查找以下关键信息:
# - "🤖 AI 分析..."
# - "❌ AI 调用失败:"
# - 具体的错误堆栈
```

### 步骤 2: 检查浏览器控制台

```
1. 按 F12 打开开发者工具
2. 切换到 Console 标签页
3. 查看红色错误信息
4. 切换到 Network 标签页
5. 筛选 XHR/Fetch 请求
6. 查看失败的 API 请求详情
```

### 步骤 3: 测试 API 连接

```bash
# 测试 API Key
curl -X POST http://localhost:3001/api/ai/test-connection \
  -H "Content-Type: application/json" \
  -d '{"api_key": "YOUR_API_KEY"}'
```

### 步骤 4: 测试面试回忆分析

```bash
curl -X POST http://localhost:3001/api/ai/extract-interview-memory \
  -H "Content-Type: application/json" \
  -d '{
    "text": "今天去了SPCC面试，面试官问：Tell me about yourself."
  }'
```

## 具体功能的故障排查

### 面试回忆分析失败

**可能原因**:
1. 输入文本太短（少于10个字）
2. 输入文本太长（超过2000字）
3. 文本格式不规范（纯乱码）
4. API Key 问题

**解决方案**:
```javascript
// 检查输入
- 文本长度: 建议 50-2000 字
- 文本内容: 应包含明显的问题
- 格式: 纯文本，避免特殊字符
```

### AI 生成题目失败

**可能原因**:
1. 类别参数错误
2. 数量过多（超过20）
3. API 限流

**解决方案**:
```bash
# 测试生成题目
curl -X POST http://localhost:3001/api/ai/generate-questions \
  -H "Content-Type: application/json" \
  -d '{
    "category": "english-oral",
    "difficulty": "medium",
    "count": 5,
    "save": false
  }'
```

### AI 生成训练计划失败

**可能原因**:
1. 学校代码不存在
2. 日期范围不合理
3. API 返回超时

**解决方案**:
- 确保学校代码存在（SPCC, QC, LSC, DBS, DGS）
- 日期范围: 1-90 天
- 每日时长: 15-60 分钟

## 联系支持

如果以上方案都无法解决问题，请提供以下信息：

1. **错误截图** - 包括浏览器控制台和页面错误
2. **操作步骤** - 如何重现问题
3. **后端日志** - 后端终端的完整输出
4. **网络请求** - 开发者工具 Network 标签页的失败请求详情
5. **环境信息**:
   - Node.js 版本: `node --version`
   - npm 版本: `npm --version`
   - 操作系统: macOS / Windows / Linux
   - 浏览器: Chrome / Safari / Firefox

## 快速修复脚本

```bash
#!/bin/bash
# 快速诊断和修复脚本

echo "=== 升中面试系统 AI 功能诊断 ==="

# 1. 检查后端服务
echo "\n1. 检查后端服务..."
curl -s http://localhost:3001/health && echo "✅ 后端正常" || echo "❌ 后端未启动"

# 2. 检查 API Key
echo "\n2. 检查 API Key 配置..."
if grep -q "DEEPSEEK_API_KEY=sk-" interview-training-system/backend/.env; then
    echo "✅ API Key 已配置"
else
    echo "❌ API Key 未配置或格式错误"
fi

# 3. 测试 API 连接
echo "\n3. 测试 API 连接..."
curl -s -X POST http://localhost:3001/api/ai/test-connection \
  -H "Content-Type: application/json" \
  -d '{}' | grep -q "success" && echo "✅ API 连接成功" || echo "❌ API 连接失败"

# 4. 检查数据库
echo "\n4. 检查数据库..."
if [ -f "interview-training-system/backend/data/interview_training.db" ]; then
    echo "✅ 数据库文件存在"
else
    echo "❌ 数据库文件不存在"
fi

echo "\n=== 诊断完成 ==="
```

保存为 `diagnose.sh` 并运行:
```bash
chmod +x diagnose.sh
./diagnose.sh
```
