# AI 語音转文字方案對比

## 可用的 AI 方案

### 方案 1: OpenAI Whisper API（推荐 - 最成熟）

**優點**：
- ✅ **準確率最高**：使用 OpenAI 的 Whisper 模型，識別準確率业界領先
- ✅ **支持多語言**：支持 99+ 種語言，包括中文、英文
- ✅ **API 简单**：RESTful API，易于集成
- ✅ **实時支持**：支持流式識別（Realtime API）
- ✅ **文件格式支持廣**：支持多種音频格式（mp3, wav, m4a 等）
- ✅ **成本可控**：按使用量付费

**缺點**：
- ❌ **需要 API Key**：需要 OpenAI API Key（或兼容的 API）
- ❌ **需要後端代理**：音频需要發送到服務器
- ❌ **有成本**：每次調用需要付费
- ❌ **需要网络**：必须聯网使用

**实现方式**：
```typescript
// 後端 API 路由
POST /api/ai/speech-to-text
Body: FormData (audio file)
Response: { text: string }
```

**成本**：约 $0.006/分鐘（根據 OpenAI 定價）

---

### 方案 2: Whisper WebGPU（浏览器內运行）

**優點**：
- ✅ **完全离线**：在浏览器內运行，无需服務器
- ✅ **隐私保护**：音频不离開设備
- ✅ **使用 WebGPU**：利用 GPU 加速，性能好
- ✅ **免费**：无需 API 费用

**缺點**：
- ❌ **需要下载模型**：模型文件较大（~150MB+）
- ❌ **浏览器要求高**：需要支持 WebGPU 的浏览器
- ❌ **性能依赖硬件**：低端设備可能较慢
- ❌ **实现复杂**：需要集成 WebGPU 代碼

**npm 包**：`whisper-web-transcriber` 或直接使用 WebGPU 实现

---

### 方案 3: whisper-web-transcriber（npm 包）

**優點**：
- ✅ **简单易用**：npm 包，開箱即用
- ✅ **浏览器內运行**：无需服務器
- ✅ **自動缓存**：模型自動缓存到 IndexedDB
- ✅ **支持多種模型**：tiny, base, quantized 等

**缺點**：
- ❌ **模型体积大**：即使 tiny 模型也有几十 MB
- ❌ **準確率可能较低**：小模型準確率不如 API
- ❌ **包維护情况**：需要检查包的活跃度

**安装**：
```bash
npm install whisper-web-transcriber
```

---

### 方案 4: OpenAI Realtime API（实時流式）

**優點**：
- ✅ **实時識別**：支持流式識別，延迟低
- ✅ **支持 WebRTC**：可以直接在浏览器中使用
- ✅ **準確率高**：使用最新的 Whisper 模型
- ✅ **支持多語言**：自動检测語言

**缺點**：
- ❌ **需要 API Key**：需要 OpenAI API
- ❌ **成本较高**：实時 API 價格可能更高
- ❌ **需要 WebSocket**：需要維护 WebSocket 连接
- ❌ **实现复杂**：需要处理实時流

---

## 推荐方案對比

| 方案 | 準確率 | 成本 | 复杂度 | 离线 | 推荐度 |
|------|--------|------|--------|------|--------|
| **OpenAI Whisper API** | ⭐⭐⭐⭐⭐ | 💰 | ⭐⭐ | ❌ | ⭐⭐⭐⭐⭐ |
| **Whisper WebGPU** | ⭐⭐⭐⭐ | 免费 | ⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐ |
| **whisper-web-transcriber** | ⭐⭐⭐ | 免费 | ⭐⭐⭐ | ✅ | ⭐⭐⭐ |
| **Web Speech API** | ⭐⭐⭐ | 免费 | ⭐ | ⚠️ | ⭐⭐⭐ |

---

## 針對本項目的推荐

### 推荐方案：OpenAI Whisper API（通過後端代理）

**理由**：
1. **已有後端架构**：項目已有 DeepSeek API 集成，可以复用相同模式
2. **準確率最高**：适合教育场景，需要高準確率
3. **实现简单**：只需添加一个後端 API 路由
4. **成本可控**：語音識別使用频率不高，成本可接受
5. **用户体验好**：識別準確，响应快

**实现步骤**：

1. **後端添加 Whisper API 路由**
   ```typescript
   // backend/src/routes/ai.ts
   POST /api/ai/speech-to-text
   - 接收音频文件（FormData）
   - 調用 OpenAI Whisper API
   - 返回識別文本
   ```

2. **前端調用**
   ```typescript
   // 錄音後上傳音频文件
   const formData = new FormData()
   formData.append('audio', audioBlob, 'recording.webm')
   const response = await fetch('/api/ai/speech-to-text', {
     method: 'POST',
     body: formData
   })
   const { text } = await response.json()
   ```

3. **配置 API Key**
   - 在环境变量中添加 `OPENAI_API_KEY`
   - 或使用兼容 OpenAI API 的其他服務

---

## 替代方案：使用兼容 OpenAI API 的服務

如果不想使用 OpenAI，可以使用兼容 OpenAI API 格式的其他服務：

1. **DeepSeek**：目前不支持語音转文字（只支持文本）
2. **其他兼容服務**：一些服務提供兼容 OpenAI API 的接口

---

## 实施建議

### 方案 A：OpenAI Whisper API（推荐）

**優點**：準確率高，实现简单，用户体验好

**实施**：
- 後端添加 `/api/ai/speech-to-text` 路由
- 前端錄音後上傳到後端
- 後端調用 OpenAI Whisper API
- 返回識別結果

**成本**：约 $0.006/分鐘，假设每次錄音 1 分鐘，1000 次使用 = $6

### 方案 B：Whisper WebGPU（如果必须离线）

**優點**：完全离线，隐私保护

**实施**：
- 使用 `whisper-web-transcriber` npm 包
- 在浏览器內运行模型
- 无需後端支持

**成本**：免费，但需要下载模型文件

---

## 結論

**推荐使用 OpenAI Whisper API**，因为：
1. 準確率最高，适合教育场景
2. 实现简单，可以复用现有後端架构
3. 成本可控，使用频率不高
4. 用户体验好

如果需要完全离线，可以考虑 Whisper WebGPU 方案。
