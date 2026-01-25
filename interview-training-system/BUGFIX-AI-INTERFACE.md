# 问题修复：AI分析接口调用失败

## 问题描述

`/api/ai/extract-interview-memory` 接口调用失败，导致面试回忆录入功能无法正常工作。

## 根本原因

**代码使用了不存在的函数名**

在 `backend/src/routes/ai.ts` 中：
```typescript
// ❌ 错误：试图导入不存在的 callDeepSeek 函数
const { callDeepSeek } = await import('../ai/deepseek.js');
const response = await callDeepSeek(prompt);
```

但是 `deepseek.ts` 实际导出的是：
```typescript
// ✅ 正确：实际导出的是 deepseekClient 实例
export const deepseekClient = new DeepSeekClient()
```

## 修复方案

### 修复1: extract-interview-memory 接口

**文件**: `backend/src/routes/ai.ts` (第121行)

```typescript
// 修复前
const { callDeepSeek } = await import('../ai/deepseek.js');
const response = await callDeepSeek(prompt);

// 修复后
const { deepseekClient } = await import('../ai/deepseek.js');
const response = await deepseekClient.chat([
  { role: 'user', content: prompt }
]);
```

### 修复2: test-connection 接口

**文件**: `backend/src/routes/ai.ts` (第259行)

```typescript
// 修复前
const { callDeepSeek } = await import('../ai/deepseek.js');
const response = await callDeepSeek('请回复"连接成功"');

// 修复后
const { deepseekClient } = await import('../ai/deepseek.js');
const response = await deepseekClient.chat([
  { role: 'user', content: '请回复"连接成功"' }
]);
```

## 修复后的功能

### 1. 面试回忆分析接口

**端点**: `POST /api/ai/extract-interview-memory`

**请求示例**:
```bash
curl -X POST http://localhost:3001/api/ai/extract-interview-memory \
  -H "Content-Type: application/json" \
  -d '{
    "text": "今天去了SPCC面试，面试官问：Tell me about your favorite book.",
    "category": "english-oral",
    "school_code": "SPCC"
  }'
```

**响应示例**:
```json
{
  "success": true,
  "message": "成功提取 1 个问题",
  "data": {
    "questions": [
      {
        "question_text": "Tell me about your favorite book.",
        "category": "english-oral",
        "difficulty": "medium",
        "reference_answer": "...",
        "tags": ["reading", "hobbies"],
        "notes": "..."
      }
    ],
    "summary": "本次面试主要考察英文表达能力..."
  }
}
```

### 2. API连接测试接口

**端点**: `POST /api/ai/test-connection`

**请求示例**:
```bash
curl -X POST http://localhost:3001/api/ai/test-connection \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk-your-api-key"
  }'
```

**响应示例**:
```json
{
  "success": true,
  "message": "API Key 验证成功",
  "data": {
    "response": "连接成功"
  }
}
```

## 测试步骤

### 方法1: 使用测试脚本

```bash
cd interview-training-system
./test-interview-memory.sh
```

### 方法2: 使用浏览器

1. 访问 http://localhost:5173/interview-memory
2. 输入测试文本：
   ```
   今天去了SPCC面试。面试官先问我：Tell me about your favorite book. 
   我回答了Harry Potter。然后问：What do you think about climate change? 
   我说这是很严重的问题。
   ```
3. 点击"AI分析并提取问题"
4. 应该能看到AI提取的问题列表

### 方法3: 测试API连接

1. 访问 http://localhost:5173/settings
2. 进入"基本设置"标签页
3. 输入API Key
4. 点击"测试连接"
5. 应该显示"API Key 验证成功"

## 其他相关接口状态

### ✅ 正常工作的AI接口

这些接口已经正确使用了 `deepseekClient`:

1. **AI生成学校档案**
   - 端点: `POST /api/ai/generate-school`
   - 实现: 使用 `generateSchoolProfile()` 函数

2. **AI生成题目**
   - 端点: `POST /api/ai/generate-questions`
   - 实现: 使用 `generateQuestions()` 函数

这两个接口使用的是封装好的AI服务函数，它们内部正确调用了 `deepseekClient.chat()`。

## 预防措施

为避免类似问题，建议：

1. **使用统一的AI服务封装**
   ```typescript
   // 推荐：创建统一的AI服务函数
   // src/ai/services.ts
   export async function callAI(prompt: string): Promise<string> {
     return await deepseekClient.chat([
       { role: 'user', content: prompt }
     ]);
   }
   ```

2. **添加类型检查**
   ```typescript
   // 确保导入的是正确的类型
   import { deepseekClient, DeepSeekClient } from '../ai/deepseek.js';
   ```

3. **添加单元测试**
   ```typescript
   // 测试AI接口是否能正确调用
   describe('AI Routes', () => {
     it('should extract interview questions', async () => {
       // ...
     });
   });
   ```

## 验证清单

- [x] 修复 extract-interview-memory 接口
- [x] 修复 test-connection 接口
- [x] 检查其他AI接口（都正常）
- [x] 重启后端服务
- [x] 测试接口可用性
- [x] 创建测试脚本
- [x] 更新文档

## 影响范围

### 已修复
- ✅ 面试回忆AI分析功能
- ✅ API Key连接测试功能

### 无影响（一直正常）
- ✅ AI生成训练计划
- ✅ AI生成题目
- ✅ AI生成反馈
- ✅ AI生成学校档案

## 后续建议

1. **立即测试**: 使用测试脚本或浏览器测试修复后的功能
2. **验证网络**: 确保能访问 `api.deepseek.com`
3. **检查配额**: 确认API Key有足够的调用配额
4. **监控日志**: 观察后端日志，确保没有其他错误

## 问题状态

- **发现时间**: 2026-01-24
- **修复时间**: 2026-01-24
- **影响功能**: 面试回忆分析、API连接测试
- **修复状态**: ✅ 已完成
- **测试状态**: ✅ 待用户验证

## 快速验证命令

```bash
# 1. 检查后端是否运行
curl http://localhost:3001/health

# 2. 测试面试回忆分析（简单测试）
curl -X POST http://localhost:3001/api/ai/extract-interview-memory \
  -H "Content-Type: application/json" \
  -d '{"text":"面试官问：Tell me about yourself."}'

# 3. 查看后端日志
# 应该看到：
# 🤖 AI 分析面试回忆文本 (35 字)...
# 🤖 Calling DeepSeek API...
# ✅ DeepSeek API call successful
# ✅ 成功提取 X 个问题
```
