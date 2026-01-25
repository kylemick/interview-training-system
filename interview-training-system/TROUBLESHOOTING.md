# AI 分析失敗 - 故障排查指南

## 常见原因和解决方案

### 1. API Key 未配置或无效

**症狀**:
- 错误信息: "API Key 验证失敗" 或 "401 Unauthorized"
- 所有AI功能都无法使用

**解决方案**:
```bash
# 检查 .env 文件
cd interview-training-system/backend
cat .env | grep DEEPSEEK_API_KEY

# 確保 API Key 格式正確（以 sk- 開头）
# 示例: DEEPSEEK_API_KEY=sk-xxx...
```

**前端测試**:
1. 访問 http://localhost:5173/settings
2. 進入"基本设置"標籤页
3. 输入 DeepSeek API Key
4. 點击"测試连接"按钮
5. 如果显示"API Key 验证成功"，說明配置正確

### 2. 网络连接問題

**症狀**:
- 错误信息: "网络连接失敗" 或 "ECONNREFUSED"
- AI功能偶尔失敗

**解决方案**:
```bash
# 测試网络连接
ping platform.deepseek.com

# 测試 API 连接
curl -X POST https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"test"}]}'
```

### 3. API 配额用尽

**症狀**:
- 错误信息: "API 調用频率超限" 或 "429 Too Many Requests"
- 之前可以用，现在突然不行

**解决方案**:
1. 访問 https://platform.deepseek.com
2. 登錄您的账號
3. 查看 API 使用量和配额
4. 等待配额重置或升级套餐

### 4. 输入文本過長

**症狀**:
- 面試回憶分析失敗
- 错误信息: "Token limit exceeded" 或 "输入過長"

**解决方案**:
- 将長文本分段处理
- 每次输入不超過 2000 字
- DeepSeek 单次请求限制约 4000 tokens

### 5. JSON 解析失敗

**症狀**:
- 错误信息: "AI返回格式错误" 或 "解析失敗"
- AI 返回了文本但无法解析

**解决方案**:
这通常是 AI 返回格式不符合预期，请重試。如果持续失敗，可能需要調整提示詞。

### 6. 後端服務未启動

**症狀**:
- 错误信息: "Failed to fetch" 或 "Network Error"
- 所有 API 请求都失敗

**解决方案**:
```bash
# 检查後端是否运行
curl http://localhost:3001/health

# 如果失敗，重启後端
cd interview-training-system/backend
npm run dev
```

### 7. CORS 問題

**症狀**:
- 浏览器控制台显示 CORS 错误
- 错误信息: "Access-Control-Allow-Origin"

**解决方案**:
後端已配置 CORS，如果出现此問題，检查：
```javascript
// backend/src/index.ts
app.use(cors()) // 確保这行存在
```

## 調試步骤

### 步骤 1: 检查後端日志

```bash
# 查看後端终端输出
# 查找以下關键信息:
# - "🤖 AI 分析..."
# - "❌ AI 調用失敗:"
# - 具体的错误堆栈
```

### 步骤 2: 检查浏览器控制台

```
1. 按 F12 打開開發者工具
2. 切换到 Console 標籤页
3. 查看红色错误信息
4. 切换到 Network 標籤页
5. 筛選 XHR/Fetch 请求
6. 查看失敗的 API 请求详情
```

### 步骤 3: 测試 API 连接

```bash
# 测試 API Key
curl -X POST http://localhost:3001/api/ai/test-connection \
  -H "Content-Type: application/json" \
  -d '{"api_key": "YOUR_API_KEY"}'
```

### 步骤 4: 测試面試回憶分析

```bash
curl -X POST http://localhost:3001/api/ai/extract-interview-memory \
  -H "Content-Type: application/json" \
  -d '{
    "text": "今天去了SPCC面試，面試官問：Tell me about yourself."
  }'
```

## 具体功能的故障排查

### 面試回憶分析失敗

**可能原因**:
1. 输入文本太短（少于10个字）
2. 输入文本太長（超過2000字）
3. 文本格式不規范（纯乱碼）
4. API Key 問題

**解决方案**:
```javascript
// 检查输入
- 文本長度: 建議 50-2000 字
- 文本內容: 应包含明显的問題
- 格式: 纯文本，避免特殊字符
```

### AI 生成題目失敗

**可能原因**:
1. 類別參數错误
2. 數量過多（超過20）
3. API 限流

**解决方案**:
```bash
# 测試生成題目
curl -X POST http://localhost:3001/api/ai/generate-questions \
  -H "Content-Type: application/json" \
  -d '{
    "category": "english-oral",
    "difficulty": "medium",
    "count": 5,
    "save": false
  }'
```

### AI 生成訓練計劃失敗

**可能原因**:
1. 學校代碼不存在
2. 日期范围不合理
3. API 返回超時

**解决方案**:
- 確保學校代碼存在（SPCC, QC, LSC, DBS, DGS）
- 日期范围: 1-90 天
- 每日時長: 15-60 分鐘

## 聯係支持

如果以上方案都无法解决問題，请提供以下信息：

1. **错误截图** - 包括浏览器控制台和页面错误
2. **操作步骤** - 如何重现問題
3. **後端日志** - 後端终端的完整输出
4. **网络请求** - 開發者工具 Network 標籤页的失敗请求详情
5. **环境信息**:
   - Node.js 版本: `node --version`
   - npm 版本: `npm --version`
   - 操作係統: macOS / Windows / Linux
   - 浏览器: Chrome / Safari / Firefox

## 快速修复脚本

```bash
#!/bin/bash
# 快速诊断和修复脚本

echo "=== 升中面試係統 AI 功能诊断 ==="

# 1. 检查後端服務
echo "\n1. 检查後端服務..."
curl -s http://localhost:3001/health && echo "✅ 後端正常" || echo "❌ 後端未启動"

# 2. 检查 API Key
echo "\n2. 检查 API Key 配置..."
if grep -q "DEEPSEEK_API_KEY=sk-" interview-training-system/backend/.env; then
    echo "✅ API Key 已配置"
else
    echo "❌ API Key 未配置或格式错误"
fi

# 3. 测試 API 连接
echo "\n3. 测試 API 连接..."
curl -s -X POST http://localhost:3001/api/ai/test-connection \
  -H "Content-Type: application/json" \
  -d '{}' | grep -q "success" && echo "✅ API 连接成功" || echo "❌ API 连接失敗"

# 4. 检查數據庫
echo "\n4. 检查數據庫..."
if [ -f "interview-training-system/backend/data/interview_training.db" ]; then
    echo "✅ 數據庫文件存在"
else
    echo "❌ 數據庫文件不存在"
fi

echo "\n=== 诊断完成 ==="
```

保存为 `diagnose.sh` 并运行:
```bash
chmod +x diagnose.sh
./diagnose.sh
```
