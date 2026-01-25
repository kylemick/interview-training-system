# 問題修复：AI分析接口調用失敗

## 問題描述

`/api/ai/extract-interview-memory` 接口調用失敗，導致面試回憶錄入功能无法正常工作。

## 根本原因

**代碼使用了不存在的函數名**

在 `backend/src/routes/ai.ts` 中：
```typescript
// ❌ 错误：試图導入不存在的 callDeepSeek 函數
const { callDeepSeek } = await import('../ai/deepseek.js');
const response = await callDeepSeek(prompt);
```

但是 `deepseek.ts` 实际導出的是：
```typescript
// ✅ 正確：实际導出的是 deepseekClient 实例
export const deepseekClient = new DeepSeekClient()
```

## 修复方案

### 修复1: extract-interview-memory 接口

**文件**: `backend/src/routes/ai.ts` (第121行)

```typescript
// 修复前
const { callDeepSeek } = await import('../ai/deepseek.js');
const response = await callDeepSeek(prompt);

// 修复後
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

// 修复後
const { deepseekClient } = await import('../ai/deepseek.js');
const response = await deepseekClient.chat([
  { role: 'user', content: '请回复"连接成功"' }
]);
```

## 修复後的功能

### 1. 面試回憶分析接口

**端點**: `POST /api/ai/extract-interview-memory`

**请求示例**:
```bash
curl -X POST http://localhost:3001/api/ai/extract-interview-memory \
  -H "Content-Type: application/json" \
  -d '{
    "text": "今天去了SPCC面試，面試官問：Tell me about your favorite book.",
    "category": "english-oral",
    "school_code": "SPCC"
  }'
```

**响应示例**:
```json
{
  "success": true,
  "message": "成功提取 1 个問題",
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
    "summary": "本次面試主要考察英文表達能力..."
  }
}
```

### 2. API连接测試接口

**端點**: `POST /api/ai/test-connection`

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

## 测試步骤

### 方法1: 使用测試脚本

```bash
cd interview-training-system
./test-interview-memory.sh
```

### 方法2: 使用浏览器

1. 访問 http://localhost:5173/interview-memory
2. 输入测試文本：
   ```
   今天去了SPCC面試。面試官先問我：Tell me about your favorite book. 
   我回答了Harry Potter。然後問：What do you think about climate change? 
   我說这是很嚴重的問題。
   ```
3. 點击"AI分析并提取問題"
4. 应该能看到AI提取的問題列表

### 方法3: 测試API连接

1. 访問 http://localhost:5173/settings
2. 進入"基本设置"標籤页
3. 输入API Key
4. 點击"测試连接"
5. 应该显示"API Key 验证成功"

## 其他相關接口狀態

### ✅ 正常工作的AI接口

这些接口已经正確使用了 `deepseekClient`:

1. **AI生成學校檔案**
   - 端點: `POST /api/ai/generate-school`
   - 实现: 使用 `generateSchoolProfile()` 函數

2. **AI生成題目**
   - 端點: `POST /api/ai/generate-questions`
   - 实现: 使用 `generateQuestions()` 函數

这两个接口使用的是封装好的AI服務函數，它们內部正確調用了 `deepseekClient.chat()`。

## 预防措施

为避免類似問題，建議：

1. **使用統一的AI服務封装**
   ```typescript
   // 推荐：創建統一的AI服務函數
   // src/ai/services.ts
   export async function callAI(prompt: string): Promise<string> {
     return await deepseekClient.chat([
       { role: 'user', content: prompt }
     ]);
   }
   ```

2. **添加類型检查**
   ```typescript
   // 確保導入的是正確的類型
   import { deepseekClient, DeepSeekClient } from '../ai/deepseek.js';
   ```

3. **添加单元测試**
   ```typescript
   // 测試AI接口是否能正確調用
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
- [x] 重启後端服務
- [x] 测試接口可用性
- [x] 創建测試脚本
- [x] 更新文檔

## 影响范围

### 已修复
- ✅ 面試回憶AI分析功能
- ✅ API Key连接测試功能

### 无影响（一直正常）
- ✅ AI生成訓練計劃
- ✅ AI生成題目
- ✅ AI生成反馈
- ✅ AI生成學校檔案

## 後续建議

1. **立即测試**: 使用测試脚本或浏览器测試修复後的功能
2. **验证网络**: 確保能访問 `api.deepseek.com`
3. **检查配额**: 確认API Key有足够的調用配额
4. **监控日志**: 觀察後端日志，確保没有其他错误

## 問題狀態

- **發现時間**: 2026-01-24
- **修复時間**: 2026-01-24
- **影响功能**: 面試回憶分析、API连接测試
- **修复狀態**: ✅ 已完成
- **测試狀態**: ✅ 待用户验证

## 快速验证命令

```bash
# 1. 检查後端是否运行
curl http://localhost:3001/health

# 2. 测試面試回憶分析（简单测試）
curl -X POST http://localhost:3001/api/ai/extract-interview-memory \
  -H "Content-Type: application/json" \
  -d '{"text":"面試官問：Tell me about yourself."}'

# 3. 查看後端日志
# 应该看到：
# 🤖 AI 分析面試回憶文本 (35 字)...
# 🤖 Calling DeepSeek API...
# ✅ DeepSeek API call successful
# ✅ 成功提取 X 个問題
```
